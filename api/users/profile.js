import { requireUser, hashPassword, comparePassword, publicUser } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const session = requireUser(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, username, role, profile_image_url')
      .eq('id', session.userId)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(publicUser(data));
  }

  if (req.method === 'PUT') {
    const { fullName, newPassword, oldPassword, profileImageUrl } = req.body || {};
    const updates = {};

    if (fullName) {
      const name = String(fullName).trim();
      if (name.length < 2 || name.length > 80) {
        return res.status(400).json({ error: 'Ang pangalan ay 2–80 characters.' });
      }
      updates.full_name = name;
    }
    if (profileImageUrl) updates.profile_image_url = profileImageUrl;

    if (newPassword) {
      if (String(newPassword).length < 8) {
        return res.status(400).json({ error: 'Ang bagong password ay 8 characters pataas.' });
      }
      if (!oldPassword) return res.status(400).json({ error: 'Kailangan ang lumang password.' });
      const { data: current, error: fetchError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', session.userId)
        .single();
      if (fetchError) return res.status(500).json({ error: fetchError.message });
      if (!comparePassword(oldPassword, current.password_hash)) {
        return res.status(401).json({ error: 'Mali ang lumang password.' });
      }
      updates.password_hash = hashPassword(newPassword);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'Walang babaguhin.' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.userId)
      .select('id, full_name, username, role, profile_image_url')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, user: publicUser(data) });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
