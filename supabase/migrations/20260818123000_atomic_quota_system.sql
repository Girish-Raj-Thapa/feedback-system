-- 1. Add quota warning tracking flag
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS last_quota_warning_sent_at timestamptz;

-- 2. Create the atomic quota-checking RPC
CREATE OR REPLACE FUNCTION public.insert_feedback_with_quota(
  p_project_id uuid,
  p_payload jsonb,
  p_free_limit int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_plan text;
  v_current_count int;
  v_inserted_id uuid;
  v_start_of_month timestamptz;
BEGIN
  -- Calculate explicit UTC month boundary
  v_start_of_month := date_trunc('month', now() at time zone 'utc');

  -- 1. Lock the subscription row for this user to serialize concurrent requests.
  -- This prevents race conditions where 20 requests all read 'count = 49' at once.
  SELECT p.user_id, s.plan
  INTO v_user_id, v_plan
  FROM public.projects p
  JOIN public.subscriptions s ON s.user_id = p.user_id
  WHERE p.id = p_project_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_or_subscription_not_found';
  END IF;

  -- 2. If the user is on the free plan, assert the quota
  IF v_plan = 'free' THEN
    SELECT count(*) INTO v_current_count
    FROM public.feedback f
    JOIN public.projects proj ON proj.id = f.project_id
    WHERE proj.user_id = v_user_id
    AND f.created_at >= v_start_of_month;

    IF v_current_count >= p_free_limit THEN
      RAISE EXCEPTION 'quota_exceeded';
    END IF;
  END IF;

  -- 3. If we made it here, insert the feedback
  INSERT INTO public.feedback (project_id, message, email, page_url, page_title, browser, os, device_type, screen_width, screen_height)
  VALUES (
    p_project_id, 
    p_payload->>'message', 
    p_payload->>'email', 
    p_payload->>'page_url',
    p_payload->>'page_title',
    p_payload->>'browser',
    p_payload->>'os',
    p_payload->>'device_type',
    (p_payload->>'screen_width')::int,
    (p_payload->>'screen_height')::int
  )
  RETURNING id INTO v_inserted_id;

  -- Return the inserted ID and the *new* count (current + 1).
  -- If Pro, we don't calculate the count to save DB cycles, so it returns 1 as dummy data.
  RETURN jsonb_build_object(
    'id', v_inserted_id, 
    'new_count', COALESCE(v_current_count, 0) + 1,
    'plan', v_plan
  );
END;
$$;
