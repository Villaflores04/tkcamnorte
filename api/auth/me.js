import { verifyToken } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, username, role, profile_image_url')
    .eq('id', user.userId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
}
