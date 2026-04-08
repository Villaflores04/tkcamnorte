import { verifyToken } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = verifyToken(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, username, role')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
}
