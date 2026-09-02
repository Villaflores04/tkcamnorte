import { requireUser, requireAdmin, CATEGORIES } from '../_lib/auth.js';
import { supabase, ANNOUNCEMENT_SELECT } from '../_lib/supabase.js';
import { attachReactions } from '../_lib/reactions.js';

export default async function handler(req, res) {
  const session = requireUser(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const { category, id } = req.query || {};
    if (id) {
      const { data, error } = await supabase
        .from('announcements')
        .select(ANNOUNCEMENT_SELECT)
        .eq('id', id)
        .single();
      if (error) return res.status(404).json({ error: 'Hindi nahanap ang anunsyo.' });
      const [withRx] = await attachReactions([data], session.userId);
      return res.status(200).json(withRx);
    }

    let query = supabase
      .from('announcements')
      .select(ANNOUNCEMENT_SELECT)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const withRx = await attachReactions(data || [], session.userId);
    return res.status(200).json(withRx);
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const { title, content, category, deadlineDate, isPinned, attachments } = req.body || {};
    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Kailangan ang title, content, at category.' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const { data: announcement, error: insertError } = await supabase
      .from('announcements')
      .insert([{
        title: String(title).trim(),
        content: String(content).trim(),
        category,
        deadline_date: deadlineDate || null,
        is_pinned: Boolean(isPinned),
        created_by: session.userId
      }])
      .select(ANNOUNCEMENT_SELECT)
      .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    if (Array.isArray(attachments) && attachments.length) {
      await supabase.from('announcement_attachments').insert(
        attachments.map((a) => ({
          announcement_id: announcement.id,
          file_url: a.fileUrl,
          file_name: a.fileName,
          file_size: a.fileSize || null
        }))
      );
    }

    const { data: full } = await supabase
      .from('announcements')
      .select(ANNOUNCEMENT_SELECT)
      .eq('id', announcement.id)
      .single();

    return res.status(201).json(full || announcement);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
