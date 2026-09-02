import { requireUser, REACTION_TYPES } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';
import { attachReactions } from '../_lib/reactions.js';

export default async function handler(req, res) {
  const session = requireUser(req, res);
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

    if (existing?.type === type) {
      await supabase.from('announcement_reactions').delete().eq('id', existing.id);
    } else if (existing) {
      await supabase.from('announcement_reactions').update({ type }).eq('id', existing.id);
    } else {
      const { error } = await supabase.from('announcement_reactions').insert([{
        announcement_id: announcementId,
        user_id: session.userId,
        type
      }]);
      if (error) {
        return res.status(500).json({
          error: 'Reactions table missing. Run schema.sql in Supabase.',
          details: error.message
        });
      }
    }

    const { data } = await supabase.from('announcements').select('id').eq('id', announcementId).single();
    const [withRx] = await attachReactions(data ? [data] : [], session.userId);
    return res.status(200).json(withRx?.reactions || { amen: 0, heart: 0, clap: 0, mine: null });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
