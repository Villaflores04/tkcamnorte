// Comment thread for one announcement: loading, replying, editing and deleting.
//
// The server returns a flat list. `threadComments` turns it into top-level comments with their
// replies; everything else here is rendering and click handling, kept in small named functions.
import { apiJson, escapeHtml, relativeTime, avatarUrl, showToast, autoGrow, icon } from './common.js';

const MAX_LENGTH = 1000;

// Flat rows (oldest first) -> [{ ...comment, replies: [...] }]. A reply whose parent is gone
// is shown as a top-level comment instead of disappearing.
export function threadComments(rows) {
  const roots = [];
  const byId = new Map();
  for (const row of rows || []) {
    const entry = { ...row, replies: [] };
    byId.set(row.id, entry);
  }
  for (const entry of byId.values()) {
    const parent = entry.parent_id ? byId.get(entry.parent_id) : null;
    (parent ? parent.replies : roots).push(entry);
  }
  return roots;
}

export function countComments(rows) {
  return (rows || []).length;
}

function composerHtml({ id, placeholder, submitLabel, cancel }) {
  return `<form class="composer" data-composer="${escapeHtml(id)}">
    <textarea rows="1" maxlength="${MAX_LENGTH}" placeholder="${escapeHtml(placeholder)}" aria-label="${escapeHtml(placeholder)}"></textarea>
    <div class="composer-actions">
      <button class="btn" type="submit">${escapeHtml(submitLabel)}</button>
      ${cancel ? '<button class="btn btn-ghost" type="button" data-cancel>Cancel</button>' : ''}
    </div>
  </form>`;
}

function commentHtml(c, { me, isReply }) {
  const person = c.user || {};
  const mine = me.id === c.user_id;
  const canManage = mine || me.role === 'admin';
  return `<article class="comment${isReply ? ' is-reply' : ''}" data-comment="${escapeHtml(c.id)}">
    <img class="comment-avatar" src="${escapeHtml(avatarUrl(person, person.full_name))}" alt="">
    <div class="comment-main">
      <div class="comment-head">
        <strong>${escapeHtml(person.full_name || 'Member')}</strong>
        <small>${relativeTime(c.created_at)}</small>
      </div>
      <p class="comment-body">${escapeHtml(c.text)}</p>
      <div class="comment-actions">
        <button type="button" data-reply="${escapeHtml(c.id)}">${icon('reply')}Reply</button>
        ${canManage ? `<button type="button" data-edit="${escapeHtml(c.id)}">Edit</button><button type="button" class="danger" data-delete="${escapeHtml(c.id)}">Delete</button>` : ''}
      </div>
      <div class="comment-slot" data-slot="${escapeHtml(c.id)}"></div>
      ${c.replies?.length ? `<div class="replies">${c.replies.map(r => commentHtml(r, { me, isReply: true })).join('')}</div>` : ''}
    </div>
  </article>`;
}

export function initComments({ announcementId, user, listEl, formEl }) {
  const state = { rows: [] };
  const topInput = formEl.querySelector('textarea');
  autoGrow(topInput);

  function render() {
    const roots = threadComments(state.rows);
    document.getElementById('commentCount')?.replaceChildren(String(state.rows.length));
    listEl.innerHTML = roots.length
      ? roots.map(c => commentHtml(c, { me: user, isReply: false })).join('')
      : '<p class="meta comments-empty">No comments yet. Ask a question or say hello.</p>';
  }

  async function load() {
    const { ok, data, error } = await apiJson(`/comments?announcementId=${encodeURIComponent(announcementId)}`);
    if (!ok) { listEl.innerHTML = `<p class="meta">${escapeHtml(error)}</p>`; return; }
    state.rows = data || [];
    render();
  }

  async function send(text, parentId) {
    const body = { announcementId, text };
    if (parentId) body.parentId = parentId;
    const result = await apiJson('/comments', { method: 'POST', body: JSON.stringify(body) });
    if (!result.ok) { showToast(result.error, 'error'); return false; }
    state.rows.push(result.data);
    render();
    return true;
  }

  // Inline editor/reply boxes live in the slot under each comment.
  function openSlot(commentId, html) {
    closeSlots();
    const slot = listEl.querySelector(`[data-slot="${CSS.escape(commentId)}"]`);
    slot.innerHTML = html;
    const input = slot.querySelector('textarea');
    autoGrow(input);
    input.focus();
    return { slot, input };
  }
  function closeSlots() { listEl.querySelectorAll('.comment-slot').forEach(s => { s.innerHTML = ''; }); }

  function startReply(commentId) {
    const { slot, input } = openSlot(commentId, composerHtml({ id: commentId, placeholder: 'Write a reply…', submitLabel: 'Reply', cancel: true }));
    const target = state.rows.find(r => r.id === commentId);
    const name = target?.user?.full_name?.split(' ')[0];
    if (name) input.placeholder = `Reply to ${name}…`;
    slot.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const button = e.submitter || slot.querySelector('[type=submit]');
      button.disabled = true;
      const saved = await send(text, commentId);
      if (!saved) button.disabled = false;
    };
  }

  function startEdit(commentId) {
    const row = state.rows.find(r => r.id === commentId);
    const { slot, input } = openSlot(commentId, composerHtml({ id: commentId, placeholder: 'Edit your comment', submitLabel: 'Save', cancel: true }));
    input.value = row.text;
    input.dispatchEvent(new Event('input'));
    slot.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || text === row.text) { closeSlots(); return; }
      const result = await apiJson('/comments', { method: 'PUT', body: JSON.stringify({ commentId, text }) });
      if (!result.ok) return showToast(result.error, 'error');
      Object.assign(row, result.data);
      render();
    };
  }

  async function remove(commentId) {
    const replies = state.rows.filter(r => r.parent_id === commentId).length;
    const message = replies ? `Delete this comment and its ${replies} repl${replies === 1 ? 'y' : 'ies'}?` : 'Delete this comment?';
    if (!confirm(message)) return;
    const result = await apiJson(`/comments?commentId=${encodeURIComponent(commentId)}`, { method: 'DELETE' });
    if (!result.ok) return showToast(result.error, 'error');
    state.rows = state.rows.filter(r => r.id !== commentId && r.parent_id !== commentId);
    render();
  }

  listEl.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button) return;
    if (button.dataset.cancel !== undefined) return closeSlots();
    if (button.dataset.reply) return startReply(button.dataset.reply);
    if (button.dataset.edit) return startEdit(button.dataset.edit);
    if (button.dataset.delete) return remove(button.dataset.delete);
  });

  formEl.onsubmit = async e => {
    e.preventDefault();
    const text = topInput.value.trim();
    if (!text) return;
    const button = formEl.querySelector('[type=submit]');
    button.disabled = true;
    const saved = await send(text);
    button.disabled = false;
    if (saved) { topInput.value = ''; topInput.dispatchEvent(new Event('input')); }
  };

  return load();
}
