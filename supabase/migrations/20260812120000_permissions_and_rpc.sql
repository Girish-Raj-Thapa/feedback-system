-- ============================================================================
-- Feedback SaaS — Security Grants & RPC Migration
-- ============================================================================
-- This migration fixes the "42501 permission denied" error by explicitly
-- granting table access to the Supabase API roles (authenticated, anon).
-- It also includes the setup_new_user_account RPC function.
-- ============================================================================

-- 1. Grant table privileges to API roles
-- Without these, the PostgREST API outright rejects queries before RLS even runs.
GRANT ALL ON TABLE public.projects TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.feedback TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subscriptions TO anon, authenticated, service_role;

-- 2. Alter Default Privileges for future tables
-- Any tables created in the future by the postgres user will automatically
-- get these privileges for the API roles.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, anon, service_role;

-- 3. Onboarding Setup RPC
-- Migration to atomically set up a new user account (subscription + default project)
-- using a SECURITY DEFINER function to bypass RLS securely.
create or replace function public.setup_new_user_account(p_plan text)
returns void
language plpgsql
security definer -- Runs as the creator of the function (superuser), bypassing RLS
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();

    -- Ensure the user is authenticated
    if v_user_id is null then
        raise exception 'Unauthorized';
    end if;

    -- Validate the plan input
    if p_plan not in ('free', 'pro') then
        raise exception 'Invalid plan';
    end if;

    -- 1. Insert the subscription (ignore if exists)
    insert into public.subscriptions (user_id, plan, status)
    values (v_user_id, p_plan, 'active')
    on conflict (user_id) do nothing;

    -- 2. Insert the default project (if one doesn't already exist)
    if not exists (select 1 from public.projects where user_id = v_user_id) then
        insert into public.projects (user_id, name, website_url)
        values (v_user_id, 'My Project', 'https://example.com');
    end if;
end;
$$;
