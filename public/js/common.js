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
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

export function formatDate(value, withTime = false) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return withTime
    ? d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
    : d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function relativeTime(value) {
  if (!value) return '';
  const d = new Date(value);
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
  const due = new Date(dateStr);
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
  const start = a.starts_at ? new Date(a.starts_at) : null;
  const end = a.ends_at ? new Date(a.ends_at) : (a.deadline_date ? new Date(a.deadline_date) : null);
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
      notify.innerHTML = '<span aria-hidden="true">🔔</span><em id="notifyBadge" hidden>0</em>';
      actions.appendChild(notify);
    }
    actions.appendChild(hamburger);
  } else if (!document.getElementById('notifyBtn')) {
    const notify = document.createElement('button');
    notify.id = 'notifyBtn';
    notify.className = 'icon-btn';
    notify.type = 'button';
    notify.setAttribute('aria-label', 'Notifications');
    notify.innerHTML = '<span aria-hidden="true">🔔</span><em id="notifyBadge" hidden>0</em>';
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
    notes.innerHTML = '<header><strong>Notifications</strong><button type="button" id="notifyClose" aria-label="Close">✕</button></header><div id="notifyList" class="notify-list"><p class="meta">Walang bagong notification.</p></div>';
    document.body.appendChild(notes);
  }

  if (shellInitialized && shellCleanup) shellCleanup();

  const closeNav = () => {
    navLinks.classList.remove('show');
    scrim.classList.remove('show');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.textContent = '☰';
    if (notes.hidden) lockBody(false);
  };
  const openNav = () => {
    notes.hidden = true;
    navLinks.classList.add('show');
    scrim.classList.add('show');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.textContent = '✕';
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
  const btn = (type, icon, label) => `
    <button type="button" class="rx-btn ${rx.mine === type ? 'active' : ''}" data-rx="${type}" data-id="${announcement.id}" aria-pressed="${rx.mine === type}" aria-label="${label}">
      <span>${icon}</span><em>${rx[type] || 0}</em>
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

export function bottomNav(active) {
  return `
    <nav class="mobile-bottom-nav" aria-label="Main navigation">
      <a class="${active === 'home' ? 'active' : ''}" href="/"><span class="nav-icon">⌂</span><span>Home</span></a>
      <a class="${active === 'feed' ? 'active' : ''}" href="/#announcementsList"><span class="nav-icon">◈</span><span>Anunsyo</span></a>
      <a class="${active === 'calendar' ? 'active' : ''}" href="/calendar.html"><span class="nav-icon">▦</span><span>Kalendaryo</span></a>
      <a class="${active === 'groups' ? 'active' : ''}" href="/groups.html"><span class="nav-icon">♧</span><span>Mga Grupo</span></a>
      <a class="${active === 'profile' ? 'active' : ''}" href="/profile.html"><span class="nav-icon">♙</span><span>Profile</span></a>
    </nav>`;
}
