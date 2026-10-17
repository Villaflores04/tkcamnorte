-- TK Cam Norte: repair script for the Like button.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query > paste > Run).
-- Safe to run more than once. It never deletes an announcement, comment, user or like.
--
-- It fixes: "Could not save your like. Please try again."
-- Typical causes: the reactions table was never created on the live database, or it still
-- has the old rule that only allowed Amen / Heart / Clap.

-- 1. Make sure the reactions table exists (a member can have one like per announcement).
create table if not exists public.announcement_reactions (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid references public.announcements(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  type text not null default 'like',
  created_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);

-- 2. Remove any old rule on this table (whatever it was named), so only Like is allowed.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.announcement_reactions'::regclass and contype = 'c'
  loop
    execute format('alter table public.announcement_reactions drop constraint %I', c.conname);
  end loop;
end $$;

-- 3. Every existing reaction (Amen / Heart / Clap) becomes that member's like.
update public.announcement_reactions set type = 'like' where type <> 'like';
alter table public.announcement_reactions add constraint announcement_reactions_type_check check (type = 'like');
alter table public.announcement_reactions alter column type set default 'like';

create index if not exists idx_reactions_announcement on public.announcement_reactions (announcement_id);

-- 4. The site's server uses the service role, so no public access is needed or granted.
alter table public.announcement_reactions enable row level security;
revoke all on public.announcement_reactions from anon, authenticated;

-- 5. Make Supabase's API notice the changes right away.
notify pgrst, 'reload schema';
