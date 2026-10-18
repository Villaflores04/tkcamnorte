-- TK Cam Norte: replies to comments.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query > paste > Run).
-- Safe to run more than once. Existing comments are kept and become top-level comments.

-- A reply points at the comment it answers. Deleting a comment also deletes its replies.
alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

create index if not exists idx_comments_parent on public.comments (parent_id);

-- Make Supabase's API notice the change right away.
notify pgrst, 'reload schema';
