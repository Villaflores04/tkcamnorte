import { supabase } from '../_lib/supabase.js';
import { comparePassword, generateToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const { data: user, error } = await supabase
    .from('users')
    .select('id, full_name, username, password_hash, role, profile_image_url')
    .eq('username', username)
    .single();

  if (!user || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = generateToken(user.id, user.role);
  res.status(200).json({
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      username: user.username,
      role: user.role,
      profileImageUrl: user.profile_image_url
    }
  });
}
