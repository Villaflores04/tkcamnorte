import { requireUser } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';
import { databaseErrorMessage, isOutOfDateDatabase } from '../_lib/db-errors.js';
import { COMMENT_SELECT, canManageComment, checkCommentText, threadRootId } from '../_lib/comments.js';

const fail = (res, status, error) => res.status(status).json({ error });

function saveError(res, error) {
  if (isOutOfDateDatabase(error)) {
    return fail(res, 503, databaseErrorMessage(error).replace('004_catch_up', '007_comment_replies'));
  }
  console.error('comments:', error.code, error.message);
  return fail(res, 500, 'Could not save your comment. Please try again.');
}

// Finds a comment and checks the signed-in person may change it.
async function findManagedComment(res, session, commentId) {
  const { data: comment, error } = await supabase.from('comments').select('id, user_id').eq('id', commentId).maybeSingle();
  if (error) { saveError(res, error); return null; }
  if (!comment) { fail(res, 404, 'Comment not found.'); return null; }
  if (!canManageComment(session, comment)) { fail(res, 403, 'You can only change your own comments.'); return null; }
  return comment;
}

async function list(req, res) {
  const announcementId = req.query?.announcementId;
  if (!announcementId) return fail(res, 400, 'announcementId required');
  const { data, error } = await supabase.from('comments').select(COMMENT_SELECT)
    .eq('announcement_id', announcementId).order('created_at', { ascending: true });
  if (error) return saveError(res, error);
  res.status(200).json(data);
}

async function create(req, res, session) {
  const { announcementId, parentId } = req.body || {};
  if (!announcementId) return fail(res, 400, 'announcementId required');
  const checked = checkCommentText(req.body?.text);
  if (checked.error) return fail(res, 400, checked.error);

  const row = { announcement_id: announcementId, user_id: session.userId, text: checked.text };
  if (parentId) {
    const { data: parent, error } = await supabase.from('comments').select('id, parent_id, announcement_id').eq('id', parentId).maybeSingle();
    if (error) return saveError(res, error);
    if (!parent || parent.announcement_id !== announcementId) return fail(res, 404, 'The comment you are replying to no longer exists.');
    row.parent_id = threadRootId(parent);
  }

  const { data, error } = await supabase.from('comments').insert([row]).select(COMMENT_SELECT).single();
  if (error) return saveError(res, error);
  res.status(201).json(data);
}

async function update(req, res, session) {
  const commentId = req.body?.commentId || req.query?.commentId;
  if (!commentId) return fail(res, 400, 'commentId required');
  const checked = checkCommentText(req.body?.text);
  if (checked.error) return fail(res, 400, checked.error);
  if (!await findManagedComment(res, session, commentId)) return;
  const { data, error } = await supabase.from('comments').update({ text: checked.text }).eq('id', commentId).select(COMMENT_SELECT).single();
  if (error) return saveError(res, error);
  res.status(200).json(data);
}

async function remove(req, res, session) {
  const commentId = req.query?.commentId || req.body?.commentId;
  if (!commentId) return fail(res, 400, 'commentId required');
  if (!await findManagedComment(res, session, commentId)) return;
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) return saveError(res, error);
  res.status(200).json({ success: true });
}

const HANDLERS = { GET: list, POST: create, PUT: update, DELETE: remove };

export default async function handler(req, res) {
  const session = await requireUser(req, res);
  if (!session) return;
  const run = HANDLERS[req.method];
  if (!run) return fail(res, 405, 'Method not allowed');
  return run(req, res, session);
}
