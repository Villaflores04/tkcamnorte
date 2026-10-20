-- TK Cam Norte schema (run in Supabase SQL editor)
-- Safe to re-run.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  username text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  profile_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null check (category in ('song_lineup','deadline','payment','project','general')),
  deadline_date date,
  starts_at date,
  ends_at date,
  cover_image_url text,
  is_pinned boolean not null default false,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements add column if not exists starts_at date;
alter table public.announcements add column if not exists ends_at date;
alter table public.announcements add column if not exists cover_image_url text;
alter table public.announcements add column if not exists updated_by uuid references public.users(id);
alter table public.announcements add column if not exists updated_at timestamptz default now();
alter table public.announcements add column if not exists voice_url text;
alter table public.announcements add column if not exists voice_duration integer;

create table if not exists public.announcement_attachments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid references public.announcements(id) on delete cascade,
  file_url text not null,
  file_name text,
  file_size int
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid references public.announcements(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.announcement_reactions (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid references public.announcements(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  type text not null default 'like' check (type = 'like'),
  created_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);

create index if not exists idx_announcements_created on public.announcements (is_pinned desc, created_at desc);
create index if not exists idx_comments_announcement on public.comments (announcement_id, created_at);
create index if not exists idx_comments_parent on public.comments (parent_id);
create index if not exists idx_reactions_announcement on public.announcement_reactions (announcement_id);
create index if not exists idx_announcements_dates on public.announcements (deadline_date, starts_at, ends_at);


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

-- Storage buckets for attachments, cover images and profile photos (existing buckets are kept as they are).
insert into storage.buckets (id, name, public)
values ('announcement-attachments', 'announcement-attachments', true),
       ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

-- Refresh Supabase's API schema cache so new columns are visible immediately.
notify pgrst, 'reload schema';
