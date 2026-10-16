-- Run before deploying the premium hub. Existing announcement dates are preserved.
-- This migration is additive and safe to re-run.
alter table public.announcements add column if not exists venue text;
alter table public.announcements add column if not exists call_time time;
alter table public.announcements add column if not exists requires_ack boolean not null default false;
create table if not exists public.announcement_receipts (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  read_version timestamptz,
  acknowledged_version timestamptz,
  primary key (announcement_id, user_id)
);
alter table public.announcement_receipts enable row level security;
-- Serverless endpoints authorize all access and use the service role.
revoke all on public.announcement_receipts from anon, authenticated;
create index if not exists idx_receipts_user on public.announcement_receipts(user_id);
