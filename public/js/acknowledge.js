// "Got it!" panel on an announcement that asks members to confirm they have read it.
// Collapsed by default: the status and button fit on one line, details open on demand.
import { apiJson, escapeHtml, showToast, icon } from './common.js';
import { versionOf, isCurrent } from './dates.js';

function memberRows(members, responses, post) {
  const byUser = new Map(responses.map(r => [r.user_id, r]));
  return members.map(m => {
    const done = isCurrent(byUser.get(m.id)?.acknowledged_version, post);
    return `<li class="${done ? 'done' : ''}"><span class="ack-dot" aria-hidden="true">${done ? icon('check') : ''}</span><span>${escapeHtml(m.full_name)}</span><small>${done ? 'Got it' : 'Not yet'}</small></li>`;
  }).join('');
}

async function loadMemberList(box, id, post) {
  const list = box.querySelector('#responseList');
  const [responses, members] = await Promise.all([
    apiJson('/announcements?resource=receipts&announcementId=' + encodeURIComponent(id)),
    apiJson('/users/all')
  ]);
  if (!responses.ok || !members.ok) { list.textContent = 'Member responses could not be loaded.'; return; }
  const total = members.data.length;
  const gotIt = members.data.filter(m => isCurrent(responses.data.find(r => r.user_id === m.id)?.acknowledged_version, post)).length;
  list.innerHTML = `<p class="ack-count"><strong>${gotIt} of ${total}</strong> members got it</p><ul class="ack-list">${memberRows(members.data, responses.data, post)}</ul>`;
}

export async function renderAcknowledgment({ box, post, user, id, open = false }) {
  if (!post?.requires_ack) { box.hidden = true; return; }
  box.hidden = false;
  const { ok, data } = await apiJson('/announcements?resource=receipts');
  if (!ok) { box.className = 'ack-panel'; box.innerHTML = '<p class="meta">Response tracking is unavailable. Please try again later.</p>'; return; }
  const receipt = data.find(r => r.announcement_id === id);
  const gotIt = isCurrent(receipt?.acknowledged_version, post);
  const isAdmin = user.role === 'admin';

  box.className = `ack-panel${gotIt ? ' is-done' : ''}`;
  box.innerHTML = `
    <div class="ack-bar">
      <span class="ack-icon" aria-hidden="true">${icon(gotIt ? 'checkCircle' : 'check')}</span>
      <div class="ack-text">
        <strong>${gotIt ? 'You’ve got it' : 'Please confirm you’ve read this'}</strong>
        ${gotIt ? '<small>Your confirmation is saved.</small>' : ''}
      </div>
      <button class="btn ack-button" id="acknowledge" type="button" ${gotIt ? 'disabled' : ''}>${gotIt ? icon('check') : ''}Got it!</button>
      <button class="icon-btn ack-toggle" id="ackToggle" type="button" aria-expanded="${open}" aria-controls="ackDetails" aria-label="${open ? 'Hide details' : 'Show details'}">${icon('chevronDown')}</button>
    </div>
    <div class="ack-details" id="ackDetails" ${open ? '' : 'hidden'}>
      <p class="meta">${gotIt ? 'You confirmed this version. If the coordinator edits the announcement, you’ll be asked again.' : 'Tap “Got it!” once you have read and understood these instructions.'}</p>
      ${isAdmin ? '<div id="responseList" class="response-list">Loading member responses…</div>' : ''}
    </div>`;

  const toggle = box.querySelector('#ackToggle');
  const details = box.querySelector('#ackDetails');
  toggle.onclick = () => {
    const show = details.hidden;
    details.hidden = !show;
    toggle.setAttribute('aria-expanded', String(show));
    toggle.setAttribute('aria-label', show ? 'Hide details' : 'Show details');
  };

  box.querySelector('#acknowledge').onclick = async e => {
    const button = e.currentTarget;
    button.disabled = true;
    const result = await apiJson('/announcements?resource=receipts', { method: 'POST', body: JSON.stringify({ announcementId: id, action: 'acknowledge', version: versionOf(post) }) });
    if (!result.ok) { button.disabled = false; showToast(result.error, 'error'); return; }
    showToast('Got it! Thanks for confirming.', 'success');
    renderAcknowledgment({ box, post, user, id, open: !details.hidden });
  };

  if (isAdmin) loadMemberList(box, id, post);
}
