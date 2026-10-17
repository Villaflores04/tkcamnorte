import { supabase } from './supabase.js';

const empty = () => ({ like: 0, mine: null });

// Likes are the only reaction. Any older reaction row (amen, heart, clap) that has not
// been migrated yet is counted as a like so the numbers stay right before the SQL runs.
export async function attachReactions(announcements, userId) {
  if (!announcements?.length) return announcements || [];
  const ids = announcements.map((a) => a.id);
  const { data, error } = await supabase
    .from('announcement_reactions')
    .select('id, announcement_id, user_id, type')
    .in('announcement_id', ids);

  if (error) {
    return announcements.map((a) => ({
      ...a,
      reactions: empty(),
      reactionsEnabled: false
    }));
  }

  const byPost = {};
  for (const row of data || []) {
    if (!byPost[row.announcement_id]) byPost[row.announcement_id] = empty();
    byPost[row.announcement_id].like += 1;
    if (row.user_id === userId) byPost[row.announcement_id].mine = 'like';
  }

  return announcements.map((a) => ({
    ...a,
    reactions: byPost[a.id] || empty(),
    reactionsEnabled: true
  }));
}
