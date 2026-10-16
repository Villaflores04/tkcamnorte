import { requireUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const session = await requireUser(req, res);
  if (!session) return;
  // Authorization already loaded the current account, including its public profile.
  res.status(200).json(session.user);
}
