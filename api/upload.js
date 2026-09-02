import busboy from 'busboy';
import { requireUser, ALLOWED_BUCKETS, ALLOWED_MIME, MAX_FILE_BYTES } from './_lib/auth.js';
import { supabase } from './_lib/supabase.js';

export const config = { api: { bodyParser: false } };

function readUpload(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_BYTES, files: 8 } });
    const jobs = [];
    let truncated = false;

    bb.on('file', (_name, file, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      file.on('limit', () => { truncated = true; });
      file.on('data', (chunk) => chunks.push(chunk));
      const done = new Promise((resFile) => {
        file.on('end', () => {
          resFile({ filename, mimeType, buffer: Buffer.concat(chunks) });
        });
      });
      jobs.push(done);
    });

    bb.on('error', reject);
    bb.on('finish', async () => {
      try {
        const files = await Promise.all(jobs);
        resolve({ files, truncated });
      } catch (err) {
        reject(err);
      }
    });

    req.pipe(bb);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = requireUser(req, res);
  if (!session) return;

  const bucket = String(req.query?.bucket || 'announcement-attachments');
  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return res.status(400).json({ error: 'Invalid bucket' });
  }

  try {
    const { files, truncated } = await readUpload(req);
    if (truncated) return res.status(400).json({ error: 'File too large (max 8MB).' });
    if (!files.length) return res.status(400).json({ error: 'No file received.' });

    const uploaded = [];
    for (const file of files) {
      if (!file.filename) continue;
      if (file.mimeType && !ALLOWED_MIME.includes(file.mimeType) && !file.mimeType.startsWith('image/')) {
        return res.status(400).json({ error: `Hindi allowed ang file type: ${file.mimeType}` });
      }
      const fileExt = (file.filename.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueName = `${session.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(uniqueName, file.buffer, { contentType: file.mimeType, upsert: false });
      if (error) return res.status(500).json({ error: error.message });
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
      uploaded.push({
        fileUrl: publicUrlData.publicUrl,
        fileName: file.filename,
        fileSize: file.buffer.length
      });
    }

    res.status(200).json({ files: uploaded });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
