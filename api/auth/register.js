import { supabase } from '../_lib/supabase.js';
import { hashPassword, generateToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fullName, username, password } = req.body;
  if (!fullName || !username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Check if username exists
  const { data: existing, error: findError } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .single();

  if (existing) return res.status(400).json({ error: 'Username already taken' });

  // Determine role: first user becomes admin
  const { count, error: countError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const role = count === 0 ? 'admin' : 'user';

  const password_hash = hashPassword(password);

  const { data: user, error: insertError } = await supabase
    .from('users')
    .insert([{ full_name: fullName, username, password_hash, role }])
    .select()
    .single();

  if (insertError) return res.status(500).json({ error: insertError.message });

  const token = generateToken(user.id, user.role);
  res.status(201).json({ token, user: { id: user.id, fullName: user.full_name, username: user.username, role: user.role } });
}
