import { supabase } from '../_lib/supabase.js';
import { comparePassword, generateToken, isRetiredPassword, publicUser, USERNAME_RE, usernamePattern } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!USERNAME_RE.test(username) || !password || password.length > 72) {
    return res.status(400).json({ error: 'Ilagay ang username at password.' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, full_name, username, password_hash, role, profile_image_url')
    .ilike('username', usernamePattern(username))
    .maybeSingle();

  // Reject the previously published bootstrap password, even on an existing account.
  if (isRetiredPassword(password)) {
    return res.status(403).json({ error: 'This password was retired. Ask the site owner to reset your account securely.' });
  }
  if (!user || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Mali ang username o password.' });
  }

  const token = generateToken(user.id, user.role, user.password_hash);
  res.status(200).json({ token, user: publicUser(user) });
}
