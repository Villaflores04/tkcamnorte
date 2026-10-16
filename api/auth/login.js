import { createHash } from 'node:crypto';
import { supabase } from '../_lib/supabase.js';
import { comparePassword, generateToken, publicUser, USERNAME_RE, usernamePattern } from '../_lib/auth.js';

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
  if (createHash('sha256').update(password).digest('hex') === '9c4b95dbebcbfb09a528dbacbb17ea0aeb2a31b859f470747f3ca1dd63c02256') {
    return res.status(403).json({ error: 'This password was retired. Ask the site owner to reset your account securely.' });
  }
  if (!user || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Mali ang username o password.' });
  }

  const token = generateToken(user.id, user.role, user.password_hash);
  res.status(200).json({ token, user: publicUser(user) });
}
