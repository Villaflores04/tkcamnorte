const API_BASE = '/api';

export const CATEGORIES = [
  { id: 'all', label: 'Lahat' },
  { id: 'song_lineup', label: 'Song line-up' },
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

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
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
  const res = await apiFetch(endpoint, options);
  if (!res) return { ok: false, status: 401, data: null, error: 'Unauthorized' };
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return {
    ok: res.ok,
    status: res.status,
    data,
    error: data?.error || (!res.ok ? 'Request failed' : null)
  };
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

export function redirectBasedOnRole(role) {
  location.href = role === 'admin' ? '/admin.html' : '/';
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

export function formatDate(value, withTime = false) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return withTime
    ? d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
    : d.toLocaleDateString('en-PH', { dateStyle: 'medium' });
}

export function deadlineMeta(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { label: `Overdue · ${formatDate(dateStr)}`, tone: 'overdue' };
  if (days === 0) return { label: 'Due today', tone: 'today' };
  if (days === 1) return { label: 'Bukas ang deadline', tone: 'soon' };
  if (days <= 7) return { label: `${days} days left`, tone: 'soon' };
  return { label: formatDate(dateStr), tone: 'ok' };
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
  if (!res) throw new Error('Unauthorized');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.files || [];
}

export function initShell(user) {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  let scrim = document.getElementById('navScrim');
  if (!scrim) {
    scrim = document.createElement('div');
    scrim.id = 'navScrim';
    scrim.className = 'nav-scrim';
    document.body.appendChild(scrim);
  }
  const closeNav = () => {
    navLinks?.classList.remove('show');
    scrim.classList.remove('show');
  };
  const openNav = () => {
    navLinks?.classList.add('show');
    scrim.classList.add('show');
  };
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.contains('show') ? closeNav() : openNav();
    });
    scrim.addEventListener('click', closeNav);
  }
  if (!navLinks) return;
  if (user) {
    navLinks.innerHTML = `
      <li class="nav-user">
        <strong>${escapeHtml(user.fullName || user.username)}</strong>
        <span>${user.role === 'admin' ? 'Coordinator' : 'Member'}</span>
      </li>
      <li><a href="/">Anunsyo</a></li>
      <li><a href="/profile.html">Profile</a></li>
      ${user.role === 'admin' ? '<li><a href="/admin.html">Coordinator</a></li>' : ''}
      <li><a href="#" id="logoutBtn">Logout</a></li>
    `;
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      location.href = '/login.html';
    });
  } else {
    navLinks.innerHTML = `
      <li><a href="/login.html">Login</a></li>
      <li><a href="/register.html">Register</a></li>
    `;
  }
}

export function renderReactions(announcement) {
  const rx = announcement.reactions || { amen: 0, heart: 0, clap: 0, mine: null };
  const btn = (type, icon) => `
    <button type="button" class="rx-btn ${rx.mine === type ? 'active' : ''}" data-rx="${type}" data-id="${announcement.id}">
      <span>${icon}</span><em>${rx[type] || 0}</em>
    </button>`;
  return `
    <div class="rx-row" data-rx-row="${announcement.id}">
      ${btn('amen', '🙏')}
      ${btn('heart', '💛')}
      ${btn('clap', '👏')}
    </div>`;
}

export async function toggleReaction(announcementId, type, rowEl) {
  const { ok, data, error } = await apiJson('/reactions', {
    method: 'POST',
    body: JSON.stringify({ announcementId, type })
  });
  if (!ok) {
    showToast(error || 'Hindi na-save ang reaction. I-run ang schema.sql kung wala pang table.', 'error');
    return;
  }
  if (rowEl) {
    rowEl.querySelectorAll('.rx-btn').forEach((btn) => {
      const t = btn.dataset.rx;
      btn.classList.toggle('active', data.mine === t);
      const em = btn.querySelector('em');
      if (em) em.textContent = data[t] || 0;
    });
  }
}

export function bindReactions(root = document) {
  root.querySelectorAll('.rx-btn').forEach((btn) => {
    btn.onclick = () => toggleReaction(btn.dataset.id, btn.dataset.rx, btn.closest('.rx-row'));
  });
}
