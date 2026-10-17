import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHash, createHmac } from 'node:crypto';
import { supabase } from './supabase.js';

const JWT_SECRET = process.env.JWT_SECRET;



export function verifyToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !String(authHeader).startsWith('Bearer ')) return null;
  const token = String(authHeader).split(' ')[1];
  if (!JWT_SECRET || !token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// The password fingerprint revokes every session when the password changes.
export function sessionVersion(hash) {
  return createHmac('sha256', JWT_SECRET).update(hash).digest('hex');
}

const requestSessions = new WeakMap();

export async function requireUser(req, res) {
  if (requestSessions.has(req)) return requestSessions.get(req);
  res.setHeader('Cache-Control', 'no-store');
  const token = verifyToken(req);
  if (!token || token.version !== 2) {
    res.status(401).json({ error: 'Please sign in again.' });
    return null;
  }
  const { data, error } = await supabase.from('users')
    .select('id, role, password_hash, full_name, username, profile_image_url').eq('id', token.userId).maybeSingle();
  if (error) { res.status(503).json({ error: 'Unable to verify your account. Please try again.' }); return null; }
  if (!data || token.sessionVersion !== sessionVersion(data.password_hash)) {
    res.status(401).json({ error: 'Your session has ended. Please sign in again.' });
    return null;
  }
  const session = { userId: data.id, role: data.role, user: publicUser(data) };
  requestSessions.set(req, session);
  return session;
}

export async function requireAdmin(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Coordinators only.' });
    return null;
  }
  return user;
}

// One previously published bootstrap password is blocked at sign-in. Setting screens use
// this check too, so nobody can save a password that login would then refuse.
const RETIRED_PASSWORD_SHA256 = '9c4b95dbebcbfb09a528dbacbb17ea0aeb2a31b859f470747f3ca1dd63c02256';
export const RETIRED_PASSWORD_MESSAGE = 'This password was retired and cannot be used. Choose a different password.';
export function isRetiredPassword(password) {
  return createHash('sha256').update(String(password)).digest('hex') === RETIRED_PASSWORD_SHA256;
}

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(userId, role, passwordHash) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ userId, role, version: 2, sessionVersion: sessionVersion(passwordHash) }, JWT_SECRET, { expiresIn: '7d' });
}

// Escape ILIKE wildcards so underscores in usernames are matched literally.
export function usernamePattern(username) { return username.replaceAll('_', '\\_'); }

export const USERNAME_RE = /^[a-zA-Z0-9._]{3,24}$/;
export const CATEGORIES = ['song_lineup', 'deadline', 'payment', 'project', 'general'];
export const REACTION_TYPES = ['amen', 'heart', 'clap'];
export const ALLOWED_BUCKETS = ['announcement-attachments', 'profile-images'];
export const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'audio/mpeg', 'audio/mp4', 'audio/wav',
  'video/mp4', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    role: row.role,
    profileImageUrl: row.profile_image_url || null
  };
}
