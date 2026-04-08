import { verifyToken } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { title, content, category, deadlineDate, isPinned, attachmentsToAdd, attachmentsToDelete } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (deadlineDate !== undefined) updateData.deadline_date = deadlineDate;
    if (isPinned !== undefined) updateData.is_pinned = isPinned;
    updateData.updated_at = new Date();

    const { error: updateError } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id);

    if (updateError) return res.status(500).json({ error: updateError.message });

    // Handle attachments deletion
    if (attachmentsToDelete && attachmentsToDelete.length) {
      await supabase
        .from('announcement_attachments')
        .delete()
        .in('id', attachmentsToDelete);
    }

    // Handle new attachments
    if (attachmentsToAdd && attachmentsToAdd.length) {
      const newRows = attachmentsToAdd.map(a => ({
        announcement_id: id,
        file_url: a.fileUrl,
        file_name: a.fileName,
        file_size: a.fileSize
      }));
      await supabase.from('announcement_attachments').insert(newRows);
    }

    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    // Delete attachments first (optional, Supabase CASCADE will handle if foreign key set)
    await supabase.from('announcement_attachments').delete().eq('announcement_id', id);
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
