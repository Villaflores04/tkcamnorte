import { requireUser, REACTION_TYPES } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';
import { attachReactions } from '../_lib/reactions.js';

const NEEDS_UPDATE = 'Likes need the latest database update. The site owner must run migrations/005_like_and_voice.sql in the Supabase SQL editor.';

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
      if (error) return res.status(500).json({ error: 'Could not remove your like. Please try again.' });
    } else {
      const { error } = await supabase.from('announcement_reactions').insert([{
        announcement_id: announcementId,
        user_id: session.userId,
        type
      }]);
      if (error) {
        return res.status(500).json({
          error: error.code === '23514' ? NEEDS_UPDATE : 'Could not save your like. Please try again.'
        });
      }
    }

    const { data } = await supabase.from('announcements').select('id').eq('id', announcementId).single();
    const [withRx] = await attachReactions(data ? [data] : [], session.userId);
    return res.status(200).json(withRx?.reactions || { like: 0, mine: null });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
