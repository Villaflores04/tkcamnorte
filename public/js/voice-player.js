// Voice message player.
//
// Recordings made in a browser (WebM/MP4) do not store their own length, so the built-in
// <audio controls> bar can show nonsense such as 16:40:19. This player shows the length that
// was saved when the message was published, and only trusts the file's own length when it agrees.
import { clockText } from './wav.js';

// Pure: which length to show. `known` is the saved length in seconds (or null),
// `reported` is what the audio element says (may be Infinity, NaN or wildly wrong).
export function trustedDuration(known, reported) {
  const saved = Number.isFinite(known) && known > 0 ? known : null;
  const heard = Number.isFinite(reported) && reported > 0 ? reported : null;
  if (saved && heard) return Math.abs(heard - saved) <= Math.max(2, saved * 0.15) ? heard : saved;
  return saved || heard || 0;
}

const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.5" height="14" rx="1.2"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.2"/></svg>';

export function voicePlayerHtml(url, seconds) {
  const known = Number.isInteger(seconds) ? seconds : null;
  return `<div class="vplayer" data-vplayer data-known="${known ?? ''}">
    <audio preload="metadata" src="${url}"></audio>
    <button class="vplayer-play" type="button" aria-label="Play voice message">${PLAY}</button>
    <input class="vplayer-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek voice message">
    <span class="vplayer-time" aria-live="off"><span data-now>0:00</span> / <span data-total>${clockText(known || 0)}</span></span>
  </div>`;
}

export function initVoicePlayers(root = document) {
  root.querySelectorAll('[data-vplayer]').forEach(player => {
    if (player.dataset.ready) return;
    player.dataset.ready = '1';
    const audio = player.querySelector('audio');
    const button = player.querySelector('.vplayer-play');
    const seek = player.querySelector('.vplayer-seek');
    const now = player.querySelector('[data-now]');
    const total = player.querySelector('[data-total]');
    const known = player.dataset.known === '' ? null : Number(player.dataset.known);
    const length = () => trustedDuration(known, audio.duration);

    function paint() {
      const end = length();
      const at = Math.min(audio.currentTime || 0, end || Infinity);
      now.textContent = clockText(at);
      total.textContent = clockText(end);
      seek.value = end ? String(Math.round((at / end) * 1000)) : '0';
      seek.style.setProperty('--fill', (Number(seek.value) / 10) + '%');
    }
    function setPlaying(on) {
      button.innerHTML = on ? PAUSE : PLAY;
      button.setAttribute('aria-label', on ? 'Pause voice message' : 'Play voice message');
      player.classList.toggle('is-playing', on);
    }

    button.onclick = () => { audio.paused ? audio.play().catch(() => {}) : audio.pause(); };
    seek.oninput = () => { const end = length(); if (end) { audio.currentTime = (Number(seek.value) / 1000) * end; paint(); } };
    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('ended', () => { setPlaying(false); audio.currentTime = 0; paint(); });
    audio.addEventListener('timeupdate', () => {
      // Some recordings keep playing past the saved length's end only if the file is longer; stop at the saved end.
      if (known && audio.currentTime >= known + 0.4 && !Number.isFinite(audio.duration)) { audio.pause(); audio.currentTime = 0; }
      paint();
    });
    audio.addEventListener('loadedmetadata', paint);
    audio.addEventListener('durationchange', paint);
    audio.addEventListener('error', () => { total.textContent = 'Unavailable'; button.disabled = true; });
    paint();
  });
}
