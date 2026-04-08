const API_BASE = '/api';

export function setToken(token) { localStorage.setItem('token', token); }
export function getToken() { return localStorage.getItem('token'); }
export function removeToken() { localStorage.removeItem('token'); }
export function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}
export function setUser(user) { localStorage.setItem('user', JSON.stringify(user)); }
export function clearSession() {
  removeToken();
  localStorage.removeItem('user');
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (res.status === 401) {
    clearSession();
    window.location.href = '/login.html';
    return null;
  }
  return res;
}

export function renderNavigation() {
  const user = getUser();
  const desktopNav = document.getElementById('navLinksDesktop');
  const mobileNav = document.getElementById('navLinksMobile');
  if (!desktopNav && !mobileNav) return;
  const adminLink = user?.role === 'admin' ? '<li><a href="/admin.html">Admin</a></li>' : '';
  const html = `
    <li><a href="/">Home</a></li>
    <li><a href="/profile.html">Profile</a></li>
    ${adminLink}
    <li><a href="#" class="logout-btn">Logout</a></li>
  `;
  if (desktopNav) desktopNav.innerHTML = html;
  if (mobileNav) mobileNav.innerHTML = html;
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = '/login.html';
    });
  });
}

export function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('navLinksMobile');
  if (hamburger && mobileMenu) {
    hamburger.onclick = (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle('show');
    };
    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
        mobileMenu.classList.remove('show');
      }
    });
  }
}

export function requireAuth() {
  if (!getUser()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

export function redirectBasedOnRole(role) {
  window.location.href = role === 'admin' ? '/admin.html' : '/';
}
