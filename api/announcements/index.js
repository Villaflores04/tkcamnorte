import receiptsHandler from '../_lib/receipts.js';
import { validateAnnouncement } from '../_lib/announcement-validation.js';
import { requireUser, requireAdmin, CATEGORIES } from '../_lib/auth.js';
import { supabase, ANNOUNCEMENT_SELECT } from '../_lib/supabase.js';
import { attachReactions } from '../_lib/reactions.js';
import { databaseErrorMessage } from '../_lib/db-errors.js';

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
  if (body.venue !== undefined) row.venue = String(body.venue || '').trim() || null;
  if (body.callTime !== undefined) row.call_time = body.callTime || null;
  if (body.requiresAck !== undefined) row.requires_ack = Boolean(body.requiresAck);
  if (isCreate) row.created_by = userId;
  row.updated_by = userId;
  row.updated_at = new Date().toISOString();
  return row;
}

export default async function handler(req, res) {
  if (req.query?.resource === 'receipts') return receiptsHandler(req, res);
  const session = await requireUser(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const { category, id, resource } = req.query || {};
    // The shell and dashboard consume the same snapshot instead of refetching it.
    const hub = resource === 'hub';
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

    const receiptQuery = hub
      ? supabase.from('announcement_receipts').select('announcement_id, read_version, acknowledged_version').eq('user_id', session.userId)
      : Promise.resolve({ data: [], error: null });
    const [{ data, error }, receiptResult] = await Promise.all([query, receiptQuery]);
    if (error) return res.status(500).json({ error: 'Unable to load announcements. Please try again.' });
    const withRx = await attachReactions(data || [], session.userId);
    if (hub) return res.status(200).json({
      announcements: withRx,
      receipts: receiptResult.error ? [] : receiptResult.data || [],
      trackingAvailable: !receiptResult.error
    });
    return res.status(200).json(withRx);
  }

  if (req.method === 'POST') {
    if (!await requireAdmin(req, res)) return;
    const validationError = validateAnnouncement(req.body || {});
    if (req.method !== 'DELETE' && validationError) return res.status(400).json({ error: validationError });
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

    if (insertError) return res.status(500).json({ error: databaseErrorMessage(insertError, 'Unable to publish this announcement. Please try again.') });

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
