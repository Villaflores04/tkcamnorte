import { supabase } from '../_lib/supabase.js';
import { comparePassword, generateToken, publicUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) {
    return res.status(400).json({ error: 'Ilagay ang username at password.' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, full_name, username, password_hash, role, profile_image_url')
    .ilike('username', username)
    .maybeSingle();

  if (!user || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Mali ang username o password.' });
  }

  const token = generateToken(user.id, user.role);
  res.status(200).json({ token, user: publicUser(user) });
}
