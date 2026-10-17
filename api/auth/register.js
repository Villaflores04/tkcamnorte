import { createHash, timingSafeEqual } from 'node:crypto';
import { supabase } from '../_lib/supabase.js';
import { hashPassword, isRetiredPassword, RETIRED_PASSWORD_MESSAGE, generateToken, publicUser, USERNAME_RE, usernamePattern } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');
  const expected = process.env.MEMBER_INVITE_CODE;
  const supplied = String(req.body?.inviteCode || '');
  const digest = value => createHash('sha256').update(value).digest();
  if (!expected || !timingSafeEqual(digest(expected), digest(supplied))) {
    return res.status(403).json({ error: 'A valid coordinator invitation code is required.' });
  }
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
  if (username.toLowerCase() === 'admin') {
    return res.status(400).json({ error: 'Reserved ang username na ito. Gumamit ng ibang username.' });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Use a password between 8 and 72 characters.' });
  }
  if (isRetiredPassword(password)) return res.status(400).json({ error: RETIRED_PASSWORD_MESSAGE });

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .ilike('username', usernamePattern(username))
    .maybeSingle();

  if (existing) return res.status(400).json({ error: 'Gamit na ang username.' });

  const passwordHash = hashPassword(password);
  const { data: user, error: insertError } = await supabase
    .from('users')
    .insert([{
      full_name: fullName,
      username,
      password_hash: passwordHash,
      role: 'user'
    }])
    .select('id, full_name, username, role, profile_image_url')
    .single();

  if (insertError) return res.status(500).json({ error: insertError.message });

  const token = generateToken(user.id, user.role, passwordHash);
  res.status(201).json({ token, user: publicUser(user) });
}
