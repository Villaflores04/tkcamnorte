import { requireAuth, initShell, apiJson, escapeHtml as esc, formatDate, categoryLabel, CATEGORIES, bottomNav, firstName, coverOf, icon, renderReactions, bindReactions, avatarUrl, relativeTime, getCommunityData, getToken } from './common.js';
import { activityStatus, todayKey, isCurrent, scheduleEntries } from './dates.js';
// Start the protected data request while the current account is being verified.
let initialCommunity = getToken() ? getCommunityData() : null;
const user = await requireAuth();
if (!user) throw new Error('Authentication required');
initShell(user);
const home = document.body.dataset.page === 'home';
document.getElementById('bottomNavHost').innerHTML = bottomNav(home ? 'home' : 'feed');
let posts = [], receipts = new Map(), tracking = false, category = 'all', page = 1;
const pageSize = 10;
const url = new URL(location.href);
let search = url.searchParams.get('q') || '';
let view = url.searchParams.get('view') || 'all';
if (!['all','unread','action','pinned'].includes(view)) view = 'all';
const hasRead = p => isCurrent(receipts.get(p.id)?.read_version, p);
const needsAck = p => p.requires_ack && !isCurrent(receipts.get(p.id)?.acknowledged_version, p);
const postUrl = p => '/announcement.html?id=' + encodeURIComponent(p.id);
function eventMeta(p) {
  return `<div class="event-meta">${p.starts_at ? `<span>${icon('clock')}${esc(formatDate(p.starts_at))}${p.call_time ? ', ' + esc(p.call_time.slice(0,5)) + ' PHT' : ''}</span>` : ''}${p.venue ? `<span>${icon('pin')}${esc(p.venue)}</span>` : ''}${p.deadline_date ? `<span>Deadline: ${esc(formatDate(p.deadline_date))}</span>` : ''}</div>`;
}
function card(p) {
  const status = activityStatus(p), cover = coverOf(p), author = p.created_by_user || {};
  return `<article class="card announcement"><div class="tag-row"><span class="badge">${esc(categoryLabel(p.category))}</span>${p.is_pinned ? '<span class="badge badge-pin">Pinned</span>' : ''}${p.voice_url ? `<span class="badge">${icon('mic')}Voice message</span>` : ''}${status ? `<span class="badge badge-muted">${status}</span>` : ''}${tracking && !hasRead(p) ? '<span class="badge badge-unread">Unread</span>' : ''}${tracking && needsAck(p) ? '<span class="badge badge-soon">Response needed</span>' : ''}</div><div class="announcement-split"><div><h3><a class="announcement-title" href="${postUrl(p)}">${esc(p.title)}</a></h3><p class="body-text summary">${esc(p.content)}</p></div>${cover ? `<img class="cover-thumb" src="${esc(cover)}" alt="" loading="lazy">` : ''}</div>${eventMeta(p)}<div class="author-row"><img src="${esc(avatarUrl(author))}" alt=""><div><strong>${esc(author.full_name || 'Coordinator')}</strong><p class="meta">${relativeTime(p.created_at)}</p></div></div><div class="card-foot">${renderReactions(p)}<a class="see-all" href="${postUrl(p)}">View announcement ${icon('arrowRight')}</a></div></article>`;
}
function render() {
  let filtered = posts.filter(p => (category === 'all' || p.category === category) && `${p.title} ${p.content} ${p.venue || ''}`.toLowerCase().includes(search.toLowerCase()));
  if (view === 'unread') filtered = filtered.filter(p => !hasRead(p));
  if (view === 'action') filtered = filtered.filter(needsAck);
  if (view === 'pinned') filtered = filtered.filter(p => p.is_pinned);
  const totalPages = Math.max(1, Math.ceil(filtered.length/pageSize));
  page = Math.min(page, totalPages);
  const visible = home ? filtered.slice(0,4) : filtered.slice((page-1)*pageSize,page*pageSize);
  const list = document.getElementById('announcementsList');
  list.innerHTML = visible.length ? visible.map(card).join('') : `<div class="card empty"><h3>${posts.length ? 'No matching announcements' : 'A fresh start'}</h3><p>${posts.length ? 'Try another category or search term.' : 'Announcements from your coordinator will appear here.'}</p>${!posts.length && user.role === 'admin' ? '<a class="btn" href="/admin.html">Create an announcement</a>' : ''}</div>`;
  bindReactions(list);
  if (!home) {
    document.getElementById('resultCount').textContent = `${filtered.length} announcement${filtered.length === 1 ? '' : 's'}`;
    const pager = document.getElementById('pagination');
    pager.innerHTML = totalPages > 1 ? `<button class="btn btn-ghost" id="previous" ${page === 1 ? 'disabled' : ''}>Previous</button><span class="meta">${page} / ${totalPages}</span><button class="btn btn-ghost" id="next" ${page === totalPages ? 'disabled' : ''}>Next</button>` : '';
    pager.querySelector('#previous')?.addEventListener('click', () => { page--; render(); list.scrollIntoView({block:'start'}); });
    pager.querySelector('#next')?.addEventListener('click', () => { page++; render(); list.scrollIntoView({block:'start'}); });
  }
}
function renderDashboard() {
  const entries = scheduleEntries(posts);
  const next = entries.find(e => e.kind === 'Activity');
  const featured = posts.find(p => p.is_pinned && activityStatus(p) !== 'Completed');
  const focus = next?.post || featured;
  const summary = document.getElementById('dashboardSummary');
  const unread = posts.filter(p => !hasRead(p)).length;
  const responses = posts.filter(needsAck).length;
  const featureLabel = next ? 'Your next activity' : focus ? 'In the spotlight' : 'Your community space';
  const featureTitle = focus ? focus.title : 'Connected in purpose. Ready to serve.';
  const featureCopy = focus ? (focus.content || '').replace(/\s+/g, ' ').slice(0, 130) + ((focus.content || '').length > 130 ? '…' : '') : 'A shared place for the updates, preparations, and moments that bring us together.';
  const featureLink = focus ? postUrl(focus) : '/announcements.html';
  const ticketDate = focus?.starts_at ? new Date(focus.starts_at.slice(0,10) + 'T12:00:00+08:00') : null;
  const fmt = o => ticketDate.toLocaleDateString('en-PH', { ...o, timeZone: 'Asia/Manila' });
  const ticket = ticketDate ? `<aside class="ticket" aria-label="Date and place"><div class="ticket-date"><span class="ticket-month">${esc(fmt({month:'long'}))}</span><span class="ticket-day">${Number(focus.starts_at.slice(8,10))}</span><span class="ticket-weekday">${esc(fmt({weekday:'long'}))}</span></div><div class="ticket-info">${focus.call_time ? `<div class="ticket-row"><span class="ticket-label">Call time</span><span class="ticket-value">${esc(focus.call_time.slice(0,5))} PHT</span></div>` : ''}${focus.venue ? `<div class="ticket-row"><span class="ticket-label">Venue</span><span class="ticket-value">${esc(focus.venue)}</span></div>` : ''}</div></aside>` : '';
  summary.innerHTML = `
    <section class="feature feature-stage${ticket ? '' : ' no-ticket'}">
      <div class="feature-copy">
        <div class="eyebrow"><span class="live-dot"></span>${esc(featureLabel)}</div>
        <h2>${esc(featureTitle)}</h2>
        <p class="feature-description">${esc(featureCopy)}</p>
        ${focus && !ticket ? eventMeta(focus) : ''}
        <div class="feature-actions"><a class="btn btn-yellow" href="${featureLink}">${next ? 'View activity details' : focus ? 'Read announcement' : 'Explore announcements'} ${icon('arrowRight')}</a><a class="feature-secondary" href="/calendar.html">Open schedule ${icon('clock')}</a></div>
      </div>
      ${ticket}
    </section>
    <div class="quick-stats">
      <a class="quick-stat" href="/announcements.html?view=unread"><div class="stat-top"><span class="stat-glyph">${icon('megaphone')}</span><span class="stat-link-arrow">↗</span></div><strong>${tracking ? unread : '—'}</strong><span>Unread updates</span><small>${tracking && unread === 0 ? 'You’re all caught up' : 'Catch up on what’s new'}</small></a>
      <a class="quick-stat stat-gold" href="/announcements.html?view=action"><div class="stat-top"><span class="stat-glyph">${icon('check')}</span><span class="stat-link-arrow">↗</span></div><strong>${tracking ? responses : '—'}</strong><span>Need acknowledgment</span><small>${tracking && responses === 0 ? 'No responses pending' : 'Review and acknowledge'}</small></a>
      <a class="quick-stat" href="/calendar.html"><div class="stat-top"><span class="stat-glyph">${icon('clock')}</span><span class="stat-link-arrow">↗</span></div><strong>${entries.length}</strong><span>Upcoming dates</span><small>Make room for what’s next</small></a>
    </div>${!tracking ? '<p class="notice">Read and acknowledgment tracking is temporarily unavailable. You can still read announcements.</p>' : ''}`;
  document.getElementById('upcomingList').innerHTML = entries.slice(0,4).map(e => {
    const date = new Date(e.date+'T12:00:00+08:00');
    return `<a class="agenda-item" href="${postUrl(e.post)}"><div class="agenda-date">${date.toLocaleDateString('en-PH',{month:'short',timeZone:'Asia/Manila'})}<strong>${Number(e.date.slice(-2))}</strong></div><div><h4>${esc(e.post.title)}</h4><p>${e.kind}${e.kind === 'Activity' && e.post.call_time ? ', ' + esc(e.post.call_time.slice(0,5)) + ' PHT' : ''}</p></div></a>`;
  }).join('') || '<p class="meta" style="margin-bottom:18px">No upcoming dates yet.</p>';
}
async function load() {
  const result = await (initialCommunity || getCommunityData({ force: true }));
  initialCommunity = null;
  if (!result.ok) {
    document.getElementById('announcementsList').innerHTML = `<div class="card empty"><h3>Unable to load announcements</h3><p>${esc(result.error)}</p><button class="btn" id="retry">Try again</button></div>`;
    document.getElementById('retry').onclick = load;
    if (home) document.getElementById('upcomingList').textContent = 'Schedule is unavailable until announcements load.';
    return;
  }
  posts = result.data.announcements || []; tracking = result.data.trackingAvailable;
  receipts = new Map((result.data.receipts || []).map(r => [r.announcement_id,r]));
  if (!home) {
    for (const option of document.querySelectorAll('#viewFilter option')) if (['unread','action'].includes(option.value)) option.disabled = !tracking;
    if (!tracking && ['unread','action'].includes(view)) { view = 'all'; document.getElementById('viewFilter').value = view; }
  }
  if (home) renderDashboard();
  render();
}
if (home) {
  document.getElementById('welcomeName').textContent = firstName(user);
  document.getElementById('todayLabel').textContent = new Date().toLocaleDateString('en-PH', {weekday:'long',month:'long',day:'numeric',timeZone:'Asia/Manila'});
} else {
  const filters = document.getElementById('filters');
  filters.innerHTML = CATEGORIES.map(c => `<button class="chip ${c.id === category ? 'active' : ''}" data-category="${c.id}" aria-pressed="${c.id === category}">${esc(c.label)}</button>`).join('');
  filters.onclick = e => { const b = e.target.closest('[data-category]'); if (!b) return; category = b.dataset.category; page = 1; for (const el of filters.children) { el.classList.toggle('active',el===b); el.setAttribute('aria-pressed',String(el===b)); } render(); };
  document.getElementById('search').value = search;
  document.getElementById('search').oninput = e => { search = e.target.value; page = 1; render(); };
  document.getElementById('viewFilter').value = view;
  document.getElementById('viewFilter').onchange = e => { view = e.target.value; page = 1; render(); };
}
await load();
