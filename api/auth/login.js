import { supabase } from '../_lib/supabase.js';
import { comparePassword, generateToken, publicUser, hashPassword, DEFAULT_ADMIN } from '../_lib/auth.js';

async function ensureDefaultAdmin() {
  const { data: existing } = await supabase
    .from('users')
    .select('id, username, role, password_hash, full_name, profile_image_url')
    .ilike('username', DEFAULT_ADMIN.username)
    .maybeSingle();

  if (!existing) {
    const { data: created, error } = await supabase
      .from('users')
      .insert([{
        full_name: 'Coordinator',
        username: DEFAULT_ADMIN.username,
        password_hash: hashPassword(DEFAULT_ADMIN.password),
        role: 'admin'
      }])
      .select('id, full_name, username, password_hash, role, profile_image_url')
      .single();
    if (error) return null;
    return created;
  }

  if (existing.role !== 'admin') {
    await supabase.from('users').update({ role: 'admin' }).eq('id', existing.id);
    existing.role = 'admin';
  }
  return existing;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) {
    return res.status(400).json({ error: 'Ilagay ang username at password.' });
  }

  if (username.toLowerCase() === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
    const admin = await ensureDefaultAdmin();
    if (admin && comparePassword(password, admin.password_hash)) {
      const token = generateToken(admin.id, 'admin');
      return res.status(200).json({ token, user: publicUser({ ...admin, role: 'admin' }) });
    }
    if (admin && !comparePassword(password, admin.password_hash)) {
      await supabase.from('users').update({
        password_hash: hashPassword(DEFAULT_ADMIN.password),
        role: 'admin'
      }).eq('id', admin.id);
      const token = generateToken(admin.id, 'admin');
      return res.status(200).json({ token, user: publicUser({ ...admin, role: 'admin' }) });
    }
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
