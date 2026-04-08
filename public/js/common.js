const API_BASE = '/api';

export function setToken(token) {
  localStorage.setItem('token', token);
}

export function getToken() {
  return localStorage.getItem('token');
}

export function removeToken() {
  localStorage.removeItem('token');
}

export function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearSession() {
  removeToken();
  localStorage.removeItem('user');
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  if (response.status === 401) {
    clearSession();
    window.location.href = '/login.html';
    return null;
  }
  return response;
}

export function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });
  }
}

export function updateNav() {
  const user = getUser();
  const nav = document.getElementById('navLinks');
  if (!nav) return;
  if (user) {
    nav.innerHTML = `
      <li><a href="/">Home</a></li>
      <li><a href="/profile.html">Profile</a></li>
      ${user.role === 'admin' ? '<li><a href="/admin.html">Admin</a></li>' : ''}
      <li><a href="#" id="logoutBtn">Logout</a></li>
    `;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearSession();
        window.location.href = '/login.html';
      });
    }
  } else {
    nav.innerHTML = `
      <li><a href="/login.html">Login</a></li>
      <li><a href="/register.html">Register</a></li>
    `;
  }
}
