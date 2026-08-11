-- ============================================================================
-- Feedback SaaS — Initial Schema Migration
-- ============================================================================
-- Tables: projects, feedback, subscriptions
-- Note: projects.user_id is intentionally NOT unique.
--       One-project-per-user is enforced at the application/UI layer only,
--       so this constraint can be relaxed later (multi-project support)
--       without a schema migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
-- gen_random_uuid() requires pgcrypto (usually already enabled on Supabase,
-- but declared here for safety / portability).
create extension if not exists pgcrypto;


-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
-- feedback_status is a true domain state -> use a real Postgres enum.
create type feedback_status as enum ('open', 'resolved');


-- ----------------------------------------------------------------------------
-- Table: projects
-- ----------------------------------------------------------------------------
create table public.projects (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,

    name            text not null,
    website_url     text not null,
    public_key      text not null default ('fb_pub_' || replace(gen_random_uuid()::text, '-', '')),
    is_active       boolean not null default true,

    widget_position text not null default 'bottom-right'
                        check (widget_position in ('bottom-right', 'bottom-left')),
    widget_color    text not null default '#000000',
    widget_text     text not null default 'Feedback',
    widget_theme    text not null default 'light'
                        check (widget_theme in ('light', 'dark', 'auto')),

    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    constraint public_key_unique unique (public_key)
    -- NOTE: no unique(user_id) constraint by design.
    -- One-project-per-user is enforced in the API layer (POST /api/project
    -- checks for an existing project and returns 409 if found).
);

comment on table public.projects is
    'One row per SaaS/website registered by a user. 1 user : N projects at the DB level; '
    '1:1 is enforced in application code for V1.';

-- Indexes
create index idx_projects_user_id on public.projects (user_id);
-- public_key already has a unique index via the unique constraint above.


-- ----------------------------------------------------------------------------
-- Table: feedback
-- ----------------------------------------------------------------------------
create table public.feedback (
    id             uuid primary key default gen_random_uuid(),
    project_id     uuid not null references public.projects(id) on delete cascade,

    message        text not null check (char_length(trim(message)) > 0 and char_length(message) <= 5000),
    email          text,

    page_url       text,
    page_title     text,

    browser        text,
    os             text,
    device_type    text,

    screen_width   integer check (screen_width is null or (screen_width > 0 and screen_width <= 20000)),
    screen_height  integer check (screen_height is null or (screen_height > 0 and screen_height <= 20000)),

    status         feedback_status not null default 'open',

    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

comment on table public.feedback is
    'Feedback submissions tied to a single project. Inserted only via the '
    'service-role widget endpoint (POST /api/widget/feedback).';

-- Indexes
create index idx_feedback_project_created on public.feedback (project_id, created_at desc);
create index idx_feedback_project_status on public.feedback (project_id, status);


-- ----------------------------------------------------------------------------
-- Table: subscriptions
-- ----------------------------------------------------------------------------
create table public.subscriptions (
    id                        uuid primary key default gen_random_uuid(),
    user_id                   uuid not null references auth.users(id) on delete cascade,

    plan                      text not null default 'free'
                                  check (plan in ('free', 'pro')),
    status                    text not null default 'active'
                                  check (status in ('active', 'canceled', 'past_due')),

    provider_customer_id      text,
    provider_subscription_id  text,

    current_period_start      timestamptz,
    current_period_end        timestamptz,

    created_at                timestamptz not null default now(),
    updated_at                timestamptz not null default now(),

    constraint subscriptions_user_id_unique unique (user_id)
);

comment on table public.subscriptions is
    'One subscription row per user (1:1). Only ever written by the '
    'service-role client (signup default insert, Stripe webhook updates).';

-- Index (unique constraint above already creates one on user_id, listed for clarity)
-- create index idx_subscriptions_user_id on public.subscriptions (user_id); -- redundant, covered by unique constraint


-- ============================================================================
-- updated_at auto-update trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_projects_updated_at
    before update on public.projects
    for each row
    execute function public.set_updated_at();

create trigger trg_feedback_updated_at
    before update on public.feedback
    for each row
    execute function public.set_updated_at();

create trigger trg_subscriptions_updated_at
    before update on public.subscriptions
    for each row
    execute function public.set_updated_at();


-- ============================================================================
-- Row Level Security
-- ============================================================================

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------
alter table public.projects enable row level security;

create policy "projects_select_own"
    on public.projects
    for select
    using (auth.uid() = user_id);

create policy "projects_insert_own"
    on public.projects
    for insert
    with check (auth.uid() = user_id);

create policy "projects_update_own"
    on public.projects
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "projects_delete_own"
    on public.projects
    for delete
    using (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- feedback
-- ----------------------------------------------------------------------------
alter table public.feedback enable row level security;

-- No INSERT policy for authenticated users: feedback is only ever inserted
-- via the service-role client in the public widget endpoint, which bypasses
-- RLS entirely. This is intentional — do not add an insert policy here.

create policy "feedback_select_own_project"
    on public.feedback
    for select
    using (
        project_id in (
            select id from public.projects where user_id = auth.uid()
        )
    );

create policy "feedback_update_own_project"
    on public.feedback
    for update
    using (
        project_id in (
            select id from public.projects where user_id = auth.uid()
        )
    )
    with check (
        project_id in (
            select id from public.projects where user_id = auth.uid()
        )
    );

create policy "feedback_delete_own_project"
    on public.feedback
    for delete
    using (
        project_id in (
            select id from public.projects where user_id = auth.uid()
        )
    );


-- ----------------------------------------------------------------------------
-- subscriptions
-- ----------------------------------------------------------------------------
alter table public.subscriptions enable row level security;

-- Select-only for the owning user. No insert/update/delete policies:
-- subscriptions are written only by trusted server-side code
-- (e.g. initial free-row creation at signup, payment-provider webhook
-- updates). The client has select-only access. This migration does not
-- create the initial free-plan row itself — that happens in application
-- code during signup/onboarding.

create policy "subscriptions_select_own"
    on public.subscriptions
    for select
    using (auth.uid() = user_id);


-- ============================================================================
-- End of migration
-- ============================================================================