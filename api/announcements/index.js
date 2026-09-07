import { requireUser, requireAdmin, CATEGORIES } from '../_lib/auth.js';
import { supabase, ANNOUNCEMENT_SELECT } from '../_lib/supabase.js';
import { attachReactions } from '../_lib/reactions.js';

async function attachCommentCounts(list) {
  if (!list?.length) return list || [];
  const ids = list.map((a) => a.id);
  const { data } = await supabase
    .from('comments')
    .select('announcement_id')
    .in('announcement_id', ids);
  const counts = {};
  for (const row of data || []) {
    counts[row.announcement_id] = (counts[row.announcement_id] || 0) + 1;
  }
  return list.map((a) => ({ ...a, comment_count: counts[a.id] || 0 }));
}

function announcementPayload(body, userId, isCreate = false) {
  const { title, content, category, deadlineDate, startsAt, endsAt, isPinned, coverImageUrl } = body || {};
  const row = {};
  if (title !== undefined) row.title = String(title).trim();
  if (content !== undefined) row.content = String(content).trim();
  if (category !== undefined) row.category = category;
  if (deadlineDate !== undefined) row.deadline_date = deadlineDate || null;
  if (startsAt !== undefined) row.starts_at = startsAt || null;
  if (endsAt !== undefined) row.ends_at = endsAt || null;
  if (isPinned !== undefined) row.is_pinned = Boolean(isPinned);
  if (coverImageUrl !== undefined) row.cover_image_url = coverImageUrl || null;
  if (isCreate) row.created_by = userId;
  row.updated_by = userId;
  row.updated_at = new Date().toISOString();
  return row;
}

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
      const [withCount] = await attachCommentCounts([withRx]);
      return res.status(200).json(withCount);
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
    const withCount = await attachCommentCounts(withRx);
    return res.status(200).json(withCount);
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const { title, content, category, attachments } = req.body || {};
    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Kailangan ang title, content, at category.' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const { data: announcement, error: insertError } = await supabase
      .from('announcements')
      .insert([announcementPayload(req.body, session.userId, true)])
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
