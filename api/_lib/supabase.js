import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: { persistSession: false, autoRefreshToken: false }
});

export const ANNOUNCEMENT_SELECT = `
  *,
  created_by_user:users(full_name, username, profile_image_url),
  attachments:announcement_attachments(id, file_url, file_name, file_size)
`;
