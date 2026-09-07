import { requireAdmin } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;

  const userId = req.body?.userId || req.query?.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (String(userId) === String(adminUser.userId)) {
    return res.status(400).json({ error: 'Hindi mo pwedeng i-delete ang sarili mong account dito.' });
  }

  const { data: target } = await supabase.from('users').select('id, role').eq('id', userId).maybeSingle();
  if (!target) return res.status(404).json({ error: 'Hindi nahanap ang member.' });

  if (target.role === 'admin') {
    const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
    if ((admins || []).length <= 1) {
      return res.status(400).json({ error: 'Hindi pwedeng i-delete ang huling coordinator.' });
  }
  }

  await supabase.from('comments').delete().eq('user_id', userId);
  await supabase.from('announcement_reactions').delete().eq('user_id', userId);
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ success: true });
}
