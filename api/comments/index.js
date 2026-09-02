import { requireUser } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

const COMMENT_SELECT = '*, user:users(full_name, username, profile_image_url)';

export default async function handler(req, res) {
  const session = requireUser(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const announcementId = req.query?.announcementId;
    if (!announcementId) return res.status(400).json({ error: 'announcementId required' });
    const { data, error } = await supabase
      .from('comments')
      .select(COMMENT_SELECT)
      .eq('announcement_id', announcementId)
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const announcementId = req.body?.announcementId;
    const text = String(req.body?.text || '').trim();
    if (!announcementId || !text) return res.status(400).json({ error: 'Missing fields' });
    if (text.length > 1000) return res.status(400).json({ error: 'Max 1000 characters.' });

    const { data, error } = await supabase
      .from('comments')
      .insert([{ announcement_id: announcementId, user_id: session.userId, text }])
      .select(COMMENT_SELECT)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'PUT') {
    const commentId = req.body?.commentId || req.query?.commentId;
    const text = String(req.body?.text || '').trim();
    if (!commentId || !text) return res.status(400).json({ error: 'commentId and text required' });

    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();
    if (fetchError) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== session.userId && session.role !== 'admin') {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const { data, error } = await supabase
      .from('comments')
      .update({ text })
      .eq('id', commentId)
      .select(COMMENT_SELECT)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const commentId = req.query?.commentId || req.body?.commentId;
    if (!commentId) return res.status(400).json({ error: 'commentId required' });

    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();
    if (fetchError) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== session.userId && session.role !== 'admin') {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
