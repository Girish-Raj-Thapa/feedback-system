-- ============================================================================
-- Activation Tracking Migration
-- ============================================================================
-- 1. Adds installation_verified_at to projects so we can track when a user's
--    widget has been verified as live on their actual website.
-- 2. Replaces the setup_new_user_account RPC: removes the automatic placeholder
--    project creation. The project is now created explicitly by the user in
--    Step 2 of the new onboarding wizard with their real website URL.
-- ============================================================================

-- 1. Add installation_verified_at to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS installation_verified_at timestamptz;

COMMENT ON COLUMN public.projects.installation_verified_at IS
  'Set when the verify-installation API confirms the widget script is live '
  'on the registered website. NULL means not yet verified.';


-- 2. Replace setup_new_user_account — subscription only, no project creation
--    The wizard now creates the project in a separate POST /api/projects call.
CREATE OR REPLACE FUNCTION public.setup_new_user_account(p_plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_plan NOT IN ('free', 'pro') THEN
        RAISE EXCEPTION 'Invalid plan';
    END IF;

    -- Create (or no-op) the subscription row
    INSERT INTO public.subscriptions (user_id, plan, status)
    VALUES (v_user_id, p_plan, 'active')
    ON CONFLICT (user_id) DO NOTHING;

    -- NOTE: We no longer create a default project here.
    -- The user provides their real website URL in Step 2 of the onboarding
    -- wizard, and the project is created via POST /api/projects at that point.
END;
$$;
