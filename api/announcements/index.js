import { verifyToken } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // GET: list announcements (newest first)
  if (req.method === 'GET') {
    const { category } = req.query;
    let query = supabase
      .from('announcements')
      .select(`
        *,
        created_by_user:users(full_name, username),
        attachments:announcement_attachments(file_url, file_name)
      `)
      .order('created_at', { ascending: false }); // 👈 NEWEST FIRST

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST: create announcement (admin only)
  if (req.method === 'POST') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const { title, content, category, deadlineDate, isPinned, attachments } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert announcement
    const { data: announcement, error: insertError } = await supabase
      .from('announcements')
      .insert([{
        title,
        content,
        category,
        deadline_date: deadlineDate || null,
        is_pinned: isPinned || false,
        created_by: user.userId
      }])
      .select()
      .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    // Insert attachments if any
    if (attachments && attachments.length) {
      const attachmentRows = attachments.map(a => ({
        announcement_id: announcement.id,
        file_url: a.fileUrl,
        file_name: a.fileName,
        file_size: a.fileSize
      }));
      await supabase.from('announcement_attachments').insert(attachmentRows);
    }

    return res.status(201).json(announcement);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
