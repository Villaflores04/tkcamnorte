// Rules shared by the comments API: text limits and how replies attach to comments.
export const COMMENT_SELECT = '*, user:users(full_name, username, profile_image_url)';
export const MAX_COMMENT_LENGTH = 1000;

// Returns { text } when the text is usable, or { error } with a message for the member.
export function checkCommentText(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { error: 'Write something first.' };
  if (text.length > MAX_COMMENT_LENGTH) return { error: `Keep it under ${MAX_COMMENT_LENGTH} characters.` };
  return { text };
}

// Threads are one level deep. Replying to a reply attaches to the top-level comment above it,
// so a conversation stays readable on a phone. Returns the id to store as parent_id.
export function threadRootId(parent) {
  return parent.parent_id || parent.id;
}

export function canManageComment(session, comment) {
  return comment.user_id === session.userId || session.role === 'admin';
}
