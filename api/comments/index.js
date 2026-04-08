import { verifyToken } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { announcementId } = req.query;
    if (!announcementId) return res.status(400).json({ error: 'announcementId required' });

    const { data, error } = await supabase
      .from('comments')
      .select(`*, user:users(full_name, username, profile_image_url)`)
      .eq('announcement_id', announcementId)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { announcementId, text } = req.body;
    if (!announcementId || !text) return res.status(400).json({ error: 'Missing fields' });

    const { data, error } = await supabase
      .from('comments')
      .insert([{ announcement_id: announcementId, user_id: user.userId, text }])
      .select(`*, user:users(full_name, username, profile_image_url)`)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'DELETE') {
    // Only admin or comment owner can delete
    const { commentId } = req.body;
    if (!commentId) return res.status(400).json({ error: 'commentId required' });

    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (fetchError) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== user.userId && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
