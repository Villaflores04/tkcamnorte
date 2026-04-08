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

// Unified navigation render for both desktop and mobile
export function renderNavigation() {
  const user = getUser();
  const desktopNav = document.getElementById('navLinksDesktop');
  const mobileNav = document.getElementById('navLinksMobile');
  
  if (!desktopNav && !mobileNav) return;
  
  const adminLink = user && user.role === 'admin' ? '<li><a href="/admin.html">Admin</a></li>' : '';
  const navHtml = `
    <li><a href="/">Home</a></li>
    <li><a href="/profile.html">Profile</a></li>
    ${adminLink}
    <li><a href="#" class="logout-btn">Logout</a></li>
  `;
  
  if (desktopNav) desktopNav.innerHTML = navHtml;
  if (mobileNav) mobileNav.innerHTML = navHtml;
  
  // Attach logout events
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = '/login.html';
    });
  });
}

// Mobile hamburger initialization
export function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('navLinksMobile');
  if (hamburger && mobileMenu) {
    // Remove any existing listener to avoid duplicates
    const newHamburger = hamburger.cloneNode(true);
    hamburger.parentNode.replaceChild(newHamburger, hamburger);
    const newMobileMenu = mobileMenu.cloneNode(true);
    mobileMenu.parentNode.replaceChild(newMobileMenu, mobileMenu);
    
    newHamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      newMobileMenu.classList.toggle('show');
    });
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!newMobileMenu.contains(e.target) && !newHamburger.contains(e.target)) {
        newMobileMenu.classList.remove('show');
      }
    });
  }
}

export function requireAuth() {
  const user = getUser();
  if (!user) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

export function redirectBasedOnRole(role) {
  if (role === 'admin') {
    window.location.href = '/admin.html';
  } else {
    window.location.href = '/';
  }
}
