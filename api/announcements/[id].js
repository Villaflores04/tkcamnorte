import { verifyToken } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  // Only allow authenticated admins
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing announcement id' });

  // DELETE: remove announcement and its attachments
  if (req.method === 'DELETE') {
    // Delete attachments first (optional, but good practice)
    const { error: attachError } = await supabase
      .from('announcement_attachments')
      .delete()
      .eq('announcement_id', id);
    if (attachError) console.error('Error deleting attachments:', attachError);

    // Delete the announcement
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true });
  }

  // Optionally support PUT for updates – but not required
  res.status(405).json({ error: 'Method not allowed' });
}
