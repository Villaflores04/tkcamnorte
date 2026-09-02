import { supabase } from './supabase.js';

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
      reactions: { amen: 0, heart: 0, clap: 0, mine: null },
      reactionsEnabled: false
    }));
  }

  const byPost = {};
  for (const row of data || []) {
    if (!byPost[row.announcement_id]) {
      byPost[row.announcement_id] = { amen: 0, heart: 0, clap: 0, mine: null };
    }
    if (byPost[row.announcement_id][row.type] !== undefined) {
      byPost[row.announcement_id][row.type] += 1;
    }
    if (row.user_id === userId) byPost[row.announcement_id].mine = row.type;
  }

  return announcements.map((a) => ({
    ...a,
    reactions: byPost[a.id] || { amen: 0, heart: 0, clap: 0, mine: null },
    reactionsEnabled: true
  }));
}
