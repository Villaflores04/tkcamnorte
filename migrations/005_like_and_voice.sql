-- TK Cam Norte: single "Like" reaction + optional voice messages on announcements.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query > paste > Run).
-- Safe to run more than once. No announcements, comments or users are deleted.

-- 1. Likes. Amen / Heart / Clap become a single Like.
--    Each member had at most one reaction per announcement, so every existing reaction
--    simply becomes that member's like and the counts stay the same.
create table if not exists public.announcement_reactions (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid references public.announcements(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  type text not null default 'like',
  created_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);
alter table public.announcement_reactions drop constraint if exists announcement_reactions_type_check;
update public.announcement_reactions set type = 'like' where type <> 'like';
alter table public.announcement_reactions add constraint announcement_reactions_type_check check (type = 'like');
alter table public.announcement_reactions alter column type set default 'like';

-- 2. Optional voice message on an announcement (file lives in the announcement-attachments bucket).
alter table public.announcements add column if not exists voice_url text;
alter table public.announcements add column if not exists voice_duration integer;

-- 3. Make Supabase's API notice the changes right away.
notify pgrst, 'reload schema';
