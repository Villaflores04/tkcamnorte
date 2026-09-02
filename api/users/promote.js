import { requireAdmin } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;

  const { userId, role } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const nextRole = role === 'user' ? 'user' : 'admin';

  if (nextRole === 'user' && String(userId) === String(adminUser.userId)) {
    const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
    if ((admins || []).length <= 1) {
      return res.status(400).json({ error: 'Hindi pwedeng i-demote ang huling coordinator.' });
    }
  }

  const { error } = await supabase.from('users').update({ role: nextRole }).eq('id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ success: true, role: nextRole });
}
