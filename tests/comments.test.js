import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCommentText, threadRootId, canManageComment, MAX_COMMENT_LENGTH } from '../api/_lib/comments.js';

// The browser module imports common.js (needs a DOM), so the threading logic is loaded in isolation.
async function loadThreading() {
  const source = (await import('node:fs/promises')).readFile(new URL('../public/js/comments.js', import.meta.url), 'utf8');
  const code = (await source).replace(/^import .*$/m, '').replace(/export function countComments[\s\S]*?\n}\n/, '');
  const start = code.indexOf('export function threadComments');
  const end = code.indexOf('function composerHtml');
  const fn = code.slice(start, end).replace('export ', '');
  return new Function(`${fn}; return threadComments;`)();
}

test('replies are grouped under their comment, oldest first', async () => {
  const threadComments = await loadThreading();
  const rows = [
    { id: 'a', text: 'first' },
    { id: 'b', text: 'second' },
    { id: 'c', parent_id: 'a', text: 'reply 1' },
    { id: 'd', parent_id: 'a', text: 'reply 2' }
  ];
  const tree = threadComments(rows);
  assert.deepEqual(tree.map(c => c.id), ['a', 'b']);
  assert.deepEqual(tree[0].replies.map(c => c.id), ['c', 'd']);
  assert.equal(tree[1].replies.length, 0);
});

test('a reply whose parent was deleted still shows as a comment', async () => {
  const threadComments = await loadThreading();
  const tree = threadComments([{ id: 'x', parent_id: 'gone', text: 'orphan' }]);
  assert.deepEqual(tree.map(c => c.id), ['x']);
});

test('comment text is trimmed and limited', () => {
  assert.equal(checkCommentText('  hello ').text, 'hello');
  assert.ok(checkCommentText('   ').error);
  assert.ok(checkCommentText('x'.repeat(MAX_COMMENT_LENGTH + 1)).error);
  assert.equal(checkCommentText('x'.repeat(MAX_COMMENT_LENGTH)).text.length, MAX_COMMENT_LENGTH);
});

test('replying to a reply attaches to the top-level comment', () => {
  assert.equal(threadRootId({ id: 'top', parent_id: null }), 'top');
  assert.equal(threadRootId({ id: 'reply', parent_id: 'top' }), 'top');
});

test('only the author or a coordinator can change a comment', () => {
  const comment = { user_id: 'u1' };
  assert.equal(canManageComment({ userId: 'u1', role: 'user' }, comment), true);
  assert.equal(canManageComment({ userId: 'u2', role: 'user' }, comment), false);
  assert.equal(canManageComment({ userId: 'u2', role: 'admin' }, comment), true);
});
