import { requireUser } from './auth.js';
import { supabase } from './supabase.js';

export default async function handler(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;
  if (req.method === 'GET') {
    if (req.query.announcementId) {
      if (session.role !== 'admin') return res.status(403).json({ error: 'Coordinators only.' });
      const { data, error } = await supabase.from('announcement_receipts')
        .select('user_id, read_version, acknowledged_version, member:users(full_name)')
        .eq('announcement_id', req.query.announcementId);
      if (error) return res.status(503).json({ error: 'Response tracking is unavailable. Contact the coordinator.' });
      return res.status(200).json(data);
    }
    const { data, error } = await supabase.from('announcement_receipts')
      .select('announcement_id, read_version, acknowledged_version').eq('user_id', session.userId);
    if (error) return res.status(503).json({ error: 'Response tracking is unavailable. Contact the coordinator.' });
    return res.status(200).json(data);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { announcementId, action, version } = req.body || {};
  if (!announcementId || !['read', 'acknowledge'].includes(action)) return res.status(400).json({ error: 'Invalid response.' });
  const { data: post } = await supabase.from('announcements').select('updated_at, created_at, requires_ack').eq('id', announcementId).maybeSingle();
  if (!post) return res.status(404).json({ error: 'Announcement not found.' });
  const current = post.updated_at || post.created_at;
  if (Date.parse(version) !== Date.parse(current)) return res.status(409).json({ error: 'This announcement changed. Reload it before responding.' });
  if (action === 'acknowledge' && !post.requires_ack) return res.status(400).json({ error: 'Acknowledgment is not required.' });
  const row = { announcement_id: announcementId, user_id: session.userId, read_version: current };
  if (action === 'acknowledge') row.acknowledged_version = current;
  const { error } = await supabase.from('announcement_receipts').upsert(row, { onConflict: 'announcement_id,user_id' });
  if (error) return res.status(503).json({ error: 'Could not save your response. Please try again.' });
  res.status(200).json({ success: true });
}
