create table public.account_deletion_logs (
    id uuid primary key default gen_random_uuid(),
    deleted_user_id uuid not null,
    deleted_email text not null,
    deleted_at timestamptz not null default now()
);

comment on table public.account_deletion_logs is
    'Audit trail for deleted accounts. No foreign keys so data persists after user deletion.';

-- RLS: Only admins/service role can access this table.
alter table public.account_deletion_logs enable row level security;
-- No policies -> default deny all for public/authenticated users.
