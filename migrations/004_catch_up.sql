-- TK Cam Norte catch-up migration.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query > paste > Run).
-- It is additive and safe to run more than once: nothing is deleted or overwritten.
--
-- It fixes: "Could not find the 'call_time' column of 'announcements' in the schema cache"
-- and any similar error for venue, requires_ack, starts_at, ends_at or cover_image_url.

-- 1. Announcement columns the site writes when publishing.
alter table public.announcements add column if not exists deadline_date date;
alter table public.announcements add column if not exists starts_at date;
alter table public.announcements add column if not exists ends_at date;
alter table public.announcements add column if not exists cover_image_url text;
alter table public.announcements add column if not exists is_pinned boolean not null default false;
alter table public.announcements add column if not exists updated_by uuid references public.users(id);
alter table public.announcements add column if not exists updated_at timestamptz default now();
alter table public.announcements add column if not exists venue text;
alter table public.announcements add column if not exists call_time time;
alter table public.announcements add column if not exists requires_ack boolean not null default false;

-- 2. Member response tracking (read / acknowledged).
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

-- 3. Storage buckets used for attachments, cover images and profile photos.
-- Buckets that already exist are left exactly as they are.
insert into storage.buckets (id, name, public)
values ('announcement-attachments', 'announcement-attachments', true),
       ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

-- 4. Make Supabase's API notice the new columns right away (clears the "schema cache" error).
notify pgrst, 'reload schema';
