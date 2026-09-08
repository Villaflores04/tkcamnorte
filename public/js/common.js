const API_BASE = '/api';

export const CATEGORIES = [
  { id: 'all', label: 'Lahat' },
  { id: 'song_lineup', label: 'Song Line-up' },
  { id: 'deadline', label: 'Deadline' },
  { id: 'payment', label: 'Ambag' },
  { id: 'project', label: 'Project' },
  { id: 'general', label: 'General' }
];

export function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label || id || '';
}

const ICONS = {
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5 19c1.4-3.2 4-5 7-5s5.6 1.8 7 5"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 19c1.2-2.8 3.4-4.2 6-4.2"/><circle cx="16.5" cy="9" r="2.4"/><path d="M14 19c.6-2.3 2.2-3.6 4.5-3.6 1.3 0 2.4.4 3.5 1.2"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2"/><path d="M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a16.6 16.6 0 0 1-3.2 3.8"/><path d="M6.1 6.1C3.6 7.9 2 12 2 12s3.5 7 10 7a10.6 10.6 0 0 0 4.2-.8"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16.5A7.5 7.5 0 1 1 12 20H6l-1 2z"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.4"/><circle cx="17" cy="16" r="2.4"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.4 4.2L18 8.6l-4.6 1.4L12 14l-1.4-4L6 8.6l4.6-1.4z"/><path d="M19 14l.6 1.8L21.4 16.4 19.6 17l-.6 1.8-.6-1.8-1.8-.6 1.8-.6z"/></svg>',
  clapper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 10l3.2-6.4L20.5 10"/><path d="M8 3.6l1.4 2.8M12 5.4l1.3 2.6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-9.2A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 2.8C19 15.6 12 20 12 20z"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4l13 4V6L4 10z"/><path d="M7.5 14.5v3.2A2.3 2.3 0 0 0 11 20"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V5"/><path d="M7 10l5-5 5 5"/><path d="M5 19h14"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l11-11-4-4L4 16z"/><path d="M13 7l4 4"/></svg>'
};

export function icon(name) {
  return ICONS[name] || ICONS.sparkles;
}

export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const svg = icon(el.dataset.icon);
    if (!svg) return;
    el.innerHTML = svg;
    el.dataset.hydrated = '1';
  });
}

export function setToken(token) {
  localStorage.setItem('token', token);
}

export function getToken() {
  return localStorage.getItem('token');
}

export function getUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function isAdmin(user = getUser()) {
  return user?.role === 'admin';
}

export function avatarUrl(person, fallbackName) {
  const url = person?.profile_image_url || person?.profileImageUrl;
  if (url) return url;
  const name = fallbackName || person?.full_name || person?.fullName || person?.username || 'Member';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0b4fbd&color=ffc629&bold=true`;
}

export function firstName(user) {
  const name = user?.fullName || user?.full_name || user?.username || 'Kaibigan';
  return String(name).trim().split(/\s+/)[0];
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    throw new Error('Hindi makakonekta sa server. Suriin ang internet connection at subukan muli.');
  }

  if (response.status === 401) {
    clearSession();
    if (!location.pathname.endsWith('/login.html') && !location.pathname.endsWith('/register.html')) {
      location.href = '/login.html';
    }
    return null;
  }
  return response;
}

export async function apiJson(endpoint, options = {}) {
  try {
    const res = await apiFetch(endpoint, options);
    if (!res) return { ok: false, status: 401, data: null, error: 'Session expired. Mag-login muli.' };
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    return {
      ok: res.ok,
      status: res.status,
      data,
      error: data?.error || (!res.ok ? 'Request failed' : null)
    };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err.message || 'Network error' };
  }
}

export async function refreshSession() {
  if (!getToken()) return null;
  const { ok, data } = await apiJson('/auth/me');
  if (!ok || !data) return null;
  setUser(data);
  return data;
}

export async function requireAuth(role) {
  if (!getToken()) {
    location.href = '/login.html';
    return null;
  }
  const user = await refreshSession() || getUser();
  if (!user) {
    location.href = '/login.html';
    return null;
  }
  if (role === 'admin' && user.role !== 'admin') {
    location.href = '/';
    return null;
  }
  return user;
}

export function redirectBasedOnRole() {
  location.href = '/';
}

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function parseDateValue(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function formatDate(value, withTime = false) {
  if (!value) return '';
  const d = parseDateValue(value);
  if (Number.isNaN(d.getTime())) return '';
  return withTime
    ? d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
    : d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function relativeTime(value) {
  if (!value) return '';
  const d = parseDateValue(value);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export function deadlineMeta(dateStr) {
  if (!dateStr) return null;
  const due = parseDateValue(dateStr);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { label: 'Overdue', tone: 'overdue', days };
  if (days === 0) return { label: 'Due today', tone: 'today', days };
  if (days === 1) return { label: '1 day left', tone: 'soon', days };
  if (days <= 14) return { label: `${days} days left`, tone: 'soon', days };
  return { label: formatDate(dateStr), tone: 'ok', days };
}

export function isOngoing(a) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = a.starts_at ? parseDateValue(a.starts_at) : null;
  const end = a.ends_at ? parseDateValue(a.ends_at) : (a.deadline_date ? parseDateValue(a.deadline_date) : null);
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(0, 0, 0, 0);
  if (start && end) return start <= today && end >= today;
  if (end) return end >= today;
  if (a.is_pinned) return true;
  return false;
}

export function coverOf(a) {
  if (a.cover_image_url) return a.cover_image_url;
  const files = Array.isArray(a.attachments) ? a.attachments : [];
  const img = files.find((f) => /\.(png|jpe?g|webp|gif)$/i.test(f.file_name || f.file_url || ''));
  return img?.file_url || null;
}

export function showToast(message, type = 'info') {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 2800);
}

export function setFormError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message || '';
  el.hidden = !message;
}

export async function uploadFiles(fileList, bucket) {
  const files = Array.from(fileList || []);
  if (!files.length) return [];
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const res = await apiFetch(`/upload?bucket=${encodeURIComponent(bucket)}`, {
    method: 'POST',
    body: formData,
    headers: {}
  });
  if (!res) throw new Error('Session expired. Mag-login muli.');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.files || [];
}

let shellInitialized = false;
let shellCleanup = null;

function lockBody(lock) {
  document.body.classList.toggle('nav-open', lock);
  document.documentElement.style.overflow = lock ? 'hidden' : '';
  document.body.style.overflow = lock ? 'hidden' : '';
}

export function initShell(user, options = {}) {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  let actions = document.getElementById('headerActions');
  if (!actions) {
    actions = document.createElement('div');
    actions.id = 'headerActions';
    actions.className = 'header-actions';
    hamburger.replaceWith(actions);
    if (!document.getElementById('notifyBtn')) {
      const notify = document.createElement('button');
      notify.id = 'notifyBtn';
      notify.className = 'icon-btn';
      notify.type = 'button';
      notify.setAttribute('aria-label', 'Notifications');
      notify.innerHTML = `${icon('bell')}<em id="notifyBadge" hidden>0</em>`;
      actions.appendChild(notify);
    }
    actions.appendChild(hamburger);
  } else if (!document.getElementById('notifyBtn')) {
    const notify = document.createElement('button');
    notify.id = 'notifyBtn';
    notify.className = 'icon-btn';
    notify.type = 'button';
    notify.setAttribute('aria-label', 'Notifications');
    notify.innerHTML = `${icon('bell')}<em id="notifyBadge" hidden>0</em>`;
    actions.insertBefore(notify, hamburger);
  }

  let scrim = document.getElementById('navScrim');
  if (!scrim) {
    scrim = document.createElement('div');
    scrim.id = 'navScrim';
    scrim.className = 'nav-scrim';
    document.body.appendChild(scrim);
  }

  let notes = document.getElementById('notifyPanel');
  if (!notes) {
    notes = document.createElement('aside');
    notes.id = 'notifyPanel';
    notes.className = 'notify-panel';
    notes.hidden = true;
    notes.innerHTML = '<header><strong>Notifications</strong><button type="button" id="notifyClose" aria-label="Close">' + icon('x') + '</button></header><div id="notifyList" class="notify-list"><p class="meta">Walang bagong notification.</p></div>';
    document.body.appendChild(notes);
  }

  if (shellInitialized && shellCleanup) shellCleanup();

  const closeNav = () => {
    navLinks.classList.remove('show');
    scrim.classList.remove('show');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = icon('menu');
    if (notes.hidden) lockBody(false);
  };
  const openNav = () => {
    notes.hidden = true;
    navLinks.classList.add('show');
    scrim.classList.add('show');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.innerHTML = icon('x');
    lockBody(true);
  };
  const toggleNav = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    navLinks.classList.contains('show') ? closeNav() : openNav();
  };
  const closeNotes = () => {
    notes.hidden = true;
    if (!navLinks.classList.contains('show')) lockBody(false);
    scrim.classList.toggle('show', navLinks.classList.contains('show'));
  };
  const openNotes = () => {
    closeNav();
    notes.hidden = false;
    scrim.classList.add('show');
    lockBody(true);
  };
  const onKeydown = (e) => {
    if (e.key === 'Escape') {
      closeNav();
      closeNotes();
    }
  };
  const onScrim = () => {
    closeNav();
    closeNotes();
  };

  hamburger.addEventListener('click', toggleNav);
  scrim.addEventListener('click', onScrim);
  document.addEventListener('keydown', onKeydown);
  document.getElementById('notifyBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    notes.hidden ? openNotes() : closeNotes();
  });
  document.getElementById('notifyClose')?.addEventListener('click', closeNotes);

  shellCleanup = () => {
    hamburger.removeEventListener('click', toggleNav);
    scrim.removeEventListener('click', onScrim);
    document.removeEventListener('keydown', onKeydown);
  };
  shellInitialized = true;

  const path = location.pathname;
  navLinks.innerHTML = user ? `
    <li class="nav-user">
      <img class="nav-avatar" src="${escapeHtml(avatarUrl(user))}" alt="">
      <strong>${escapeHtml(user.fullName || user.username)}</strong>
      <span>${user.role === 'admin' ? 'Coordinator' : 'Member'}</span>
    </li>
    <li><a href="/" class="${path === '/' || path.endsWith('/index.html') ? 'active' : ''}">Home</a></li>
    <li><a href="/#announcementsList">Anunsyo</a></li>
    <li><a href="/calendar.html" class="${path.endsWith('/calendar.html') ? 'active' : ''}">Kalendaryo</a></li>
    <li><a href="/groups.html" class="${path.endsWith('/groups.html') ? 'active' : ''}">Mga Grupo</a></li>
    <li><a href="/profile.html" class="${path.endsWith('/profile.html') ? 'active' : ''}">Profile</a></li>
    ${user.role === 'admin' ? `<li><a href="/admin.html" class="${path.endsWith('/admin.html') ? 'active' : ''}">Coordinator</a></li>` : ''}
    <li><a href="#" id="logoutBtn">Logout</a></li>
  ` : `
    <li><a href="/login.html">Login</a></li>
    <li><a href="/register.html">Register</a></li>
  `;

  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearSession();
    closeNav();
    location.href = '/login.html';
  });

  hydrateIcons(document);
  if (options.loadNotifications !== false) loadNotifications();
}

export async function loadNotifications() {
  const list = document.getElementById('notifyList');
  const badge = document.getElementById('notifyBadge');
  if (!list) return;
  const { ok, data } = await apiJson('/announcements');
  if (!ok || !Array.isArray(data)) return;
  const ongoing = data.filter((a) => isOngoing(a) || a.is_pinned);
  if (badge) {
    badge.textContent = String(ongoing.length);
    badge.hidden = ongoing.length === 0;
  }
  if (!ongoing.length) {
    list.innerHTML = '<p class="meta">Walang ongoing announcement ngayon.</p>';
    return;
  }
  list.innerHTML = ongoing.map((a) => `
    <a class="notify-item" href="/announcement.html?id=${encodeURIComponent(a.id)}">
      <span class="badge badge-soon">Ongoing</span>
      <strong>${escapeHtml(a.title)}</strong>
      <small>${escapeHtml(categoryLabel(a.category))}${a.deadline_date ? ' · ' + escapeHtml(formatDate(a.deadline_date)) : ''}</small>
    </a>
  `).join('');
}

export function renderReactions(announcement) {
  const rx = announcement.reactions || { amen: 0, heart: 0, clap: 0, mine: null };
  const btn = (type, glyph, label) => `
    <button type="button" class="rx-btn ${rx.mine === type ? 'active' : ''}" data-rx="${type}" data-id="${announcement.id}" aria-pressed="${rx.mine === type}" aria-label="${label}">
      <span>${glyph}</span><em>${rx[type] || 0}</em>
    </button>`;
  return `
    <div class="rx-row" data-rx-row="${announcement.id}">
      ${btn('amen', '🙏', 'Amen')}
      ${btn('heart', '💛', 'Heart')}
      ${btn('clap', '👏', 'Clap')}
    </div>`;
}

const pendingReactions = new Set();

export async function toggleReaction(announcementId, type, rowEl) {
  const key = `${announcementId}:${type}`;
  if (pendingReactions.has(key)) return;
  pendingReactions.add(key);
  const button = rowEl?.querySelector(`.rx-btn[data-rx="${CSS.escape(type)}"]`);
  if (button) button.disabled = true;
  try {
    const { ok, data, error } = await apiJson('/reactions', {
      method: 'POST',
      body: JSON.stringify({ announcementId, type })
    });
    if (!ok) {
      showToast(error || 'Hindi na-save ang reaction. Run schema.sql sa Supabase.', 'error');
      return;
    }
    if (rowEl) {
      rowEl.querySelectorAll('.rx-btn').forEach((btn) => {
        const t = btn.dataset.rx;
        const active = data.mine === t;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
        const em = btn.querySelector('em');
        if (em) em.textContent = data[t] || 0;
      });
    }
  } finally {
    pendingReactions.delete(key);
    if (button) button.disabled = false;
  }
}

export function bindReactions(root = document) {
  root.querySelectorAll('.rx-btn').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleReaction(btn.dataset.id, btn.dataset.rx, btn.closest('.rx-row'));
    };
  });
}

export function autoGrow(el, maxPx = 160) {
  if (!el) return;
  const resize = () => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`;
  };
  el.addEventListener('input', resize);
  resize();
}

export function bottomNav(active) {
  return `
    <nav class="mobile-bottom-nav" aria-label="Main navigation">
      <a class="${active === 'home' ? 'active' : ''}" href="/">${icon('home')}<span>Home</span></a>
      <a class="${active === 'feed' ? 'active' : ''}" href="/#announcementsList">${icon('megaphone')}<span>Anunsyo</span></a>
      <a class="${active === 'calendar' ? 'active' : ''}" href="/calendar.html">${icon('clock')}<span>Kalendaryo</span></a>
      <a class="${active === 'groups' ? 'active' : ''}" href="/groups.html">${icon('users')}<span>Mga Grupo</span></a>
      <a class="${active === 'profile' ? 'active' : ''}" href="/profile.html">${icon('user')}<span>Profile</span></a>
    </nav>`;
}
