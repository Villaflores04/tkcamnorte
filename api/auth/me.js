import { requireUser, publicUser } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const session = requireUser(req, res);
  if (!session) return;

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, username, role, profile_image_url')
    .eq('id', session.userId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'User not found' });
  res.status(200).json(publicUser(data));
}
