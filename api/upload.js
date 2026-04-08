import busboy from 'busboy';
import { verifyToken } from './_lib/auth.js';
import { supabase } from './_lib/supabase.js';

export const config = {
  api: {
    bodyParser: false, // required for file uploads
  },
};

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const bb = busboy({ headers: req.headers });
  const files = [];

  bb.on('file', (name, file, info) => {
    const { filename, encoding, mimeType } = info;
    const chunks = [];
    file.on('data', (chunk) => chunks.push(chunk));
    file.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      // Determine bucket based on fieldname or query param
      const bucket = req.query.bucket || 'announcement-attachments';
      const fileExt = filename.split('.').pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(uniqueName, buffer, { contentType: mimeType, upsert: false });
      if (error) {
        files.push({ error: error.message });
      } else {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
        files.push({ fileUrl: publicUrlData.publicUrl, fileName: filename, fileSize: buffer.length });
      }
    });
  });

  bb.on('finish', () => {
    if (files.some(f => f.error)) {
      return res.status(500).json({ error: 'Upload failed', details: files });
    }
    res.status(200).json({ files });
  });

  req.pipe(bb);
}
