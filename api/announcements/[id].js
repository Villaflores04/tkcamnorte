import { requireUser, requireAdmin, CATEGORIES } from '../_lib/auth.js';
import { supabase, ANNOUNCEMENT_SELECT } from '../_lib/supabase.js';
import { attachReactions } from '../_lib/reactions.js';

async function removeStorageFiles(announcementId) {
  const { data: files } = await supabase
    .from('announcement_attachments')
    .select('file_url')
    .eq('announcement_id', announcementId);
  const paths = (files || [])
    .map((f) => {
      try {
        const url = new URL(f.file_url);
        const parts = url.pathname.split('/announcement-attachments/');
        return parts[1] ? decodeURIComponent(parts[1]) : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  if (paths.length) {
    await supabase.storage.from('announcement-attachments').remove(paths);
  }
}

export default async function handler(req, res) {
  const session = requireUser(req, res);
  if (!session) return;
  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'Missing announcement id' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('announcements')
      .select(ANNOUNCEMENT_SELECT)
      .eq('id', id)
      .single();
    if (error) return res.status(404).json({ error: 'Hindi nahanap ang anunsyo.' });
    const [withRx] = await attachReactions([data], session.userId);
    return res.status(200).json(withRx);
  }

  if (req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    const { title, content, category, deadlineDate, isPinned, attachments } = req.body || {};
    const updates = {};
    if (title) updates.title = String(title).trim();
    if (content) updates.content = String(content).trim();
    if (category) {
      if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
      updates.category = category;
    }
    if (deadlineDate !== undefined) updates.deadline_date = deadlineDate || null;
    if (isPinned !== undefined) updates.is_pinned = Boolean(isPinned);

    const { error: updateError } = await supabase.from('announcements').update(updates).eq('id', id);
    if (updateError) return res.status(500).json({ error: updateError.message });

    if (Array.isArray(attachments)) {
      await removeStorageFiles(id);
      await supabase.from('announcement_attachments').delete().eq('announcement_id', id);
      if (attachments.length) {
        await supabase.from('announcement_attachments').insert(
          attachments.map((a) => ({
            announcement_id: id,
            file_url: a.fileUrl,
            file_name: a.fileName,
            file_size: a.fileSize || null
          }))
        );
      }
    }

    const { data } = await supabase.from('announcements').select(ANNOUNCEMENT_SELECT).eq('id', id).single();
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    await supabase.from('comments').delete().eq('announcement_id', id);
    await supabase.from('announcement_reactions').delete().eq('announcement_id', id);
    await removeStorageFiles(id);
    await supabase.from('announcement_attachments').delete().eq('announcement_id', id);
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
