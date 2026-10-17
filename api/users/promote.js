import accessHandler, { requireOwner } from '../_lib/owner-access.js';
import { hashPassword, USERNAME_RE, usernamePattern } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

const FIELDS = 'id, full_name, username, role, profile_image_url, created_at';
async function lastAdmin(target, role, removing) {
  if (target.role !== 'admin' || (!removing && role !== 'user')) return false;
  const { count, error } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin');
  if (error) throw Error('Unable to verify coordinator accounts. Please try again.');
  return count <= 1;
}
export default async function handler(req, res) {
  if (req.query?.resource === 'access') return accessHandler(req, res);
  if (!requireOwner(req, res)) return;
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('users').select(FIELDS).order('created_at', { ascending: false });
    if (error) return res.status(503).json({ error: 'Unable to load users. Please try again.' });
    return res.status(200).json(data);
  }
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const creating = req.method === 'POST' && body.action === 'create';
  const removing = req.method === 'DELETE';
  if (!creating && !body.userId) return res.status(400).json({ error: 'Choose a user first.' });
  const updates = {};
  if (body.fullName !== undefined || creating) {
    const fullName = String(body.fullName || '').trim();
    if (fullName.length < 2 || fullName.length > 80) return res.status(400).json({ error: 'Use a name between 2 and 80 characters.' });
    updates.full_name = fullName;
  }
  if (body.username !== undefined || creating) {
    const username = String(body.username || '').trim();
    if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'Username: 3–24 letters, numbers, dots or underscores.' });
    updates.username = username;
  }
  if (body.role !== undefined || creating) {
    if (!['user', 'admin'].includes(body.role)) return res.status(400).json({ error: 'Choose Member or Admin.' });
    updates.role = body.role;
  }
  if (body.password || creating) {
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'New passwords must be 8–72 characters.' });
    updates.password_hash = hashPassword(password);
  }
  try {
    if (!creating) {
      const { data: target, error } = await supabase.from('users').select('id, role').eq('id', body.userId).maybeSingle();
      if (error) return res.status(503).json({ error: 'Unable to load this user. Try again.' });
      if (!target) return res.status(404).json({ error: 'This user no longer exists. Refresh the list.' });
      if (await lastAdmin(target, updates.role, removing)) return res.status(409).json({ error: 'Keep at least one admin. Promote another member before demoting or deleting the last admin.' });
    }
    if (updates.username) {
      const { data: existing, error } = await supabase.from('users').select('id').ilike('username', usernamePattern(updates.username)).maybeSingle();
      if (error) return res.status(503).json({ error: 'Unable to check this username. Try again.' });
      if (existing && (creating || existing.id !== body.userId)) return res.status(409).json({ error: 'This username is already in use.' });
    }
    if (removing) {
      // One delete statement: FK cascades remove dependent rows together, or the entire
      // statement fails for accounts referenced by announcement history. Never pre-delete.
      const { data, error } = await supabase.from('users').delete().eq('id', body.userId).select('id');
      if (error?.code === '23503') return res.status(409).json({ error: 'This account has announcement history and must be kept to preserve the records. If it is an admin, you can demote it to Member.' });
      if (error) return res.status(503).json({ error: 'Unable to delete this user. No partial deletion was performed.' });
      if (!data?.length) return res.status(404).json({ error: 'This user no longer exists.' });
      return res.status(200).json({ success: true, deleted: true });
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No changes to save.' });
    let query = creating ? supabase.from('users').insert([updates]) : supabase.from('users').update(updates).eq('id', body.userId);
    const { data, error } = await query.select(FIELDS).single();
    if (error?.code === '23505') return res.status(409).json({ error: 'This username is already in use.' });
    if (error) return res.status(503).json({ error: 'Unable to save this user. Please try again.' });
    return res.status(creating ? 201 : 200).json({ success: true, user: data });
  } catch (error) {
    return res.status(503).json({ error: error.message || 'Unable to complete this change.' });
  }
}
