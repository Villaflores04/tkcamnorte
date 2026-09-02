import { requireAdmin } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;
  const id = req.query?.id || req.body?.id;
  if (!id) return res.status(400).json({ error: 'Missing announcement id' });

  await supabase.from('comments').delete().eq('announcement_id', id);
  await supabase.from('announcement_reactions').delete().eq('announcement_id', id);

  const { data: files } = await supabase
    .from('announcement_attachments')
    .select('file_url')
    .eq('announcement_id', id);
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
  if (paths.length) await supabase.storage.from('announcement-attachments').remove(paths);

  await supabase.from('announcement_attachments').delete().eq('announcement_id', id);
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ success: true });
}
