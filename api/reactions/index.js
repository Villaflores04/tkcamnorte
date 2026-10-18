import { requireUser, REACTION_TYPES } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';
import { attachReactions } from '../_lib/reactions.js';
import { isOutOfDateDatabase } from '../_lib/db-errors.js';

const NEEDS_UPDATE = 'Likes need the latest database update. The site owner must run migrations/006_fix_likes.sql in the Supabase SQL editor.';

export default async function handler(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;

  if (req.method === 'POST') {
    const announcementId = req.body?.announcementId;
    const type = req.body?.type;
    if (!announcementId || !REACTION_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Valid announcementId and type required' });
    }

    const { data: existing } = await supabase
      .from('announcement_reactions')
      .select('id, type')
      .eq('announcement_id', announcementId)
      .eq('user_id', session.userId)
      .maybeSingle();

    if (existing) {
      // Pressing Like again removes the like. This also clears any older reaction type.
      const { error } = await supabase.from('announcement_reactions').delete().eq('id', existing.id);
      if (error) {
        console.error('Could not remove like:', error.code, error.message);
        return res.status(500).json({ error: `Could not remove your like. Please try again. (error ${error.code || 'unknown'})` });
      }
    } else {
      const { error } = await supabase.from('announcement_reactions').insert([{
        announcement_id: announcementId,
        user_id: session.userId,
        type
      }]);
      if (error) {
        console.error('Could not save like:', error.code, error.message);
        if (error.code === '23514' || isOutOfDateDatabase(error)) return res.status(500).json({ error: NEEDS_UPDATE });
        if (error.code === '23503') return res.status(404).json({ error: 'This announcement no longer exists. Refresh the page.' });
        return res.status(500).json({ error: `Could not save your like. Please try again. (error ${error.code || 'unknown'})` });
      }
    }

    const { data } = await supabase.from('announcements').select('id').eq('id', announcementId).single();
    const [withRx] = await attachReactions(data ? [data] : [], session.userId);
    return res.status(200).json(withRx?.reactions || { like: 0, mine: null });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
