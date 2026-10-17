import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

const COOKIE = 'tk_owner';
const LIFETIME = 15 * 60;
const CODE_PATTERN = /^\d{6}$/;
const attempts = new Map();
const digest = value => createHash('sha256').update(value).digest();
function signingKey() {
  const code = process.env.OWNER_ACCESS_CODE?.trim();
  if (!process.env.JWT_SECRET || !code || !CODE_PATTERN.test(code)) return null;
  return createHmac('sha256', process.env.JWT_SECRET).update('tk-owner-console:' + code).digest('hex');
}
function cookie(value, age) {
  return `${COOKIE}=${value}; Path=/api/users; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
}
export function sameOrigin(req) {
  try {
    const origin = new URL(req.headers.origin || '');
    return origin.host === req.headers.host && origin.protocol === 'https:';
  } catch { return false; }
}
export function ownerSession(req) {
  const key = signingKey();
  if (!key) return null;
  const raw = String(req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  try {
    const session = jwt.verify(raw, key, { algorithms: ['HS256'], audience: 'tk-owner-console', issuer: 'tkcamnorte' });
    return session.scope === 'manage-users' ? session : null;
  } catch { return null; }
}
export function requireOwner(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(req.method) && !sameOrigin(req)) {
    res.status(403).json({ error: 'Open this page from the TK Cam Norte website before making changes.' });
    return null;
  }
  const session = ownerSession(req);
  if (!session) {
    res.status(401).json({ error: 'Your management session is locked. Enter the secret code again.' });
    return null;
  }
  return session;
}
export default async function accessHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    const session = ownerSession(req);
    return res.status(200).json({ unlocked: Boolean(session), expiresAt: session ? session.exp * 1000 : null });
  }
  if (!['POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Please open the secret-code page on this website.' });
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', cookie('', 0));
    return res.status(200).json({ success: true });
  }
  const key = signingKey();
  if (!key) return res.status(503).json({ error: 'Secret access is not configured. The site owner must set OWNER_ACCESS_CODE in Vercel to a private 6-digit code (numbers only), then redeploy.' });
  // Burst protection per running instance; keep the 6-digit code private.
  const address = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  for (const [ip, entry] of attempts) if (entry.until <= now) attempts.delete(ip);
  const attempt = attempts.get(address) || { failures: 0, until: now + 60000 };
  if (attempt.failures >= 5) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((attempt.until - now) / 1000))));
    return res.status(429).json({ error: 'Too many attempts. Wait one minute and try again.' });
  }
  const supplied = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!CODE_PATTERN.test(supplied) || !timingSafeEqual(digest(supplied), digest(process.env.OWNER_ACCESS_CODE.trim()))) {
    attempt.failures++;
    if (attempts.size >= 2000) attempts.delete(attempts.keys().next().value);
    attempts.set(address, attempt);
    return res.status(403).json({ error: 'Incorrect secret code.' });
  }
  attempts.delete(address);
  const token = jwt.sign({ scope: 'manage-users' }, key, { algorithm: 'HS256', expiresIn: LIFETIME, audience: 'tk-owner-console', issuer: 'tkcamnorte' });
  res.setHeader('Set-Cookie', cookie(token, LIFETIME));
  return res.status(200).json({ success: true, expiresAt: (Math.floor(now / 1000) + LIFETIME) * 1000 });
}
