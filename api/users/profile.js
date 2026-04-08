import { verifyToken, hashPassword, comparePassword } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, username, profile_image_url')
      .eq('id', user.userId)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const { fullName, newPassword, oldPassword, profileImageUrl } = req.body;
    const updates = {};

    if (fullName) updates.full_name = fullName;
    if (profileImageUrl) updates.profile_image_url = profileImageUrl;

    if (newPassword) {
      if (!oldPassword) return res.status(400).json({ error: 'Old password required' });
      // Verify old password
      const { data: current, error: fetchError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', user.userId)
        .single();
      if (fetchError) return res.status(500).json({ error: fetchError.message });
      if (!comparePassword(oldPassword, current.password_hash)) {
        return res.status(401).json({ error: 'Old password is incorrect' });
      }
      updates.password_hash = hashPassword(newPassword);
    }

    const { error } = await supabase.from('users').update(updates).eq('id', user.userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
