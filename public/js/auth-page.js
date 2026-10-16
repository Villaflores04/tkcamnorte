import { apiJson, setToken, setUser, getToken, refreshSession, setFormError, hydrateIcons, icon, mountThemeToggle } from './common.js';
import { stageArtwork, initParallax } from './motion.js';
const register = document.body.dataset.auth === 'register';
mountThemeToggle(document.getElementById('authThemeHost'));
document.getElementById('authArtwork').innerHTML = stageArtwork();
hydrateIcons(document);
initParallax(document);
document.querySelectorAll('[data-password]').forEach(button => {
  button.onclick = () => {
    const input = document.getElementById(button.dataset.password);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.innerHTML = icon(show ? 'eyeOff' : 'eye');
    button.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} ${input.id === 'confirmPassword' ? 'confirm password' : 'password'}`);
  };
});
let submitting = false;
document.getElementById('authForm').onsubmit = async e => {
  e.preventDefault();
  if (submitting) return;
  setFormError('formError', '');
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById(register ? 'password' : 'loginPassword').value;
  if (register && password !== document.getElementById('confirmPassword').value) return setFormError('formError', 'Your passwords do not match.');
  if (register && !/^[a-zA-Z0-9._]{3,24}$/.test(username)) return setFormError('formError', 'Use 3–24 letters, numbers, dots or underscores for your username.');
  submitting = true;
  const button = document.getElementById('submitBtn');
  const label = button.querySelector('.label');
  button.disabled = true;button.setAttribute('aria-busy', 'true');
  label.textContent = register ? 'Creating your account…' : 'Signing you in…';
  const body = { username, password };
  if (register) Object.assign(body, { fullName: document.getElementById('fullName').value.trim(), inviteCode: document.getElementById('inviteCode').value });
  try {
    const result = await apiJson(register ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(body) });
    if (!result.ok) { setFormError('formError', result.error || 'Please try again.'); return; }
    setToken(result.data.token);setUser(result.data.user);location.href = '/';
  } finally {
    submitting = false;button.disabled = false;button.removeAttribute('aria-busy');
    label.textContent = register ? 'Create account' : 'Sign in';
  }
};
// Bind the form first so a slow session check cannot delay typing or submission.
if (!register && getToken()) refreshSession().then(user => { if (user) location.href = '/'; });
