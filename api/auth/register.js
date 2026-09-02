import { supabase } from '../_lib/supabase.js';
import { hashPassword, generateToken, publicUser, USERNAME_RE } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const fullName = String(req.body?.fullName || '').trim();
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (!fullName || !username || !password) {
    return res.status(400).json({ error: 'Kumpletuhin ang lahat ng fields.' });
  }
  if (fullName.length < 2 || fullName.length > 80) {
    return res.status(400).json({ error: 'Ang pangalan ay 2–80 characters.' });
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username: 3–24 letters, numbers, dot o underscore.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Ang password ay dapat 8 characters pataas.' });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .ilike('username', username)
    .maybeSingle();

  if (existing) return res.status(400).json({ error: 'Gamit na ang username.' });

  const { data: user, error: insertError } = await supabase
    .from('users')
    .insert([{
      full_name: fullName,
      username,
      password_hash: hashPassword(password),
      role: 'user'
    }])
    .select('id, full_name, username, role, profile_image_url')
    .single();

  if (insertError) return res.status(500).json({ error: insertError.message });

  const token = generateToken(user.id, user.role);
  res.status(201).json({ token, user: publicUser(user) });
}
