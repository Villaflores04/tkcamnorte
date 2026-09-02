import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

export function requireUser(req, res) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return user;
}

export function requireAdmin(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Coordinators only.' });
    return null;
  }
  return user;
}

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(userId, role) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

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
