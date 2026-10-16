// Small decorative layers share one frame scheduler. No continuously running animation.
const scenes = new Map();
let frame = 0;
let listening = false;
let observer;
let reduced;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function reset(scene) {
  scene.style.removeProperty('--scene-y');
  scene.style.removeProperty('--scene-x');
  scene.style.removeProperty('--scene-pointer-y');
}

function draw() {
  frame = 0;
  if (reduced?.matches || document.hidden) return;
  const height = window.innerHeight || document.documentElement.clientHeight;
  for (const [scene, state] of scenes) {
    if (!scene.isConnected) { observer?.unobserve(scene); scenes.delete(scene); continue; }
    if (!state.visible) continue;
    const rect = scene.getBoundingClientRect();
    // Keep travel bounded, including when a scene is larger than the viewport.
    const progress = clamp((height / 2 - rect.top - rect.height / 2) / Math.max(height, 1), -1, 1);
    scene.style.setProperty('--scene-y', `${(progress * 32).toFixed(2)}px`);
    scene.style.setProperty('--scene-x', `${state.x.toFixed(2)}px`);
    scene.style.setProperty('--scene-pointer-y', `${state.y.toFixed(2)}px`);
  }
}

function schedule() {
  if (!frame && !reduced?.matches && !document.hidden) frame = window.requestAnimationFrame(draw);
}

function syncPreference() {
  if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
  for (const scene of scenes.keys()) reset(scene);
  if (!reduced.matches) schedule();
}

export function initParallax(root = document) {
  // Static artwork remains visible when motion APIs are unavailable.
  if (!window.requestAnimationFrame || !window.matchMedia) return;
  if (!listening) {
    listening = true;
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.addEventListener?.('change', syncPreference);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && frame) { window.cancelAnimationFrame(frame); frame = 0; }
      else schedule();
    });
    if ('IntersectionObserver' in window) observer = new window.IntersectionObserver(entries => {
      for (const entry of entries) {
        const state = scenes.get(entry.target);
        if (state) state.visible = entry.isIntersecting;
      }
      schedule();
    });
  }
  // Remove scenes replaced by a data refresh.
  for (const scene of scenes.keys()) if (!scene.isConnected) { observer?.unobserve(scene); scenes.delete(scene); }
  const found = [...root.querySelectorAll('[data-parallax]')];
  if (root.matches?.('[data-parallax]')) found.unshift(root);
  for (const scene of found) {
    if (scenes.has(scene)) continue;
    const state = { x: 0, y: 0, visible: !observer };
    scenes.set(scene, state);
    observer?.observe(scene);
    scene.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || reduced.matches) return;
      const rect = scene.getBoundingClientRect();
      state.x = clamp((e.clientX - rect.left) / Math.max(rect.width, 1) - .5, -.5, .5) * 14;
      state.y = clamp((e.clientY - rect.top) / Math.max(rect.height, 1) - .5, -.5, .5) * 10;
      schedule();
    }, { passive: true });
    scene.addEventListener('pointerleave', () => { state.x = 0; state.y = 0; schedule(); });
  }
  schedule();
}

export function stageArtwork() {
  return `<div class="stage-art" aria-hidden="true">
    <div class="stage-layer stage-halo"></div>
    <div class="stage-layer stage-orbit stage-orbit-outer"></div>
    <div class="stage-layer stage-orbit stage-orbit-inner"></div>
    <div class="stage-layer stage-disc"><span>TK</span><small>CAM NORTE</small></div>
    <div class="stage-layer stage-ribbon"></div>
    <div class="stage-layer stage-caption"><span class="stage-spark">✦</span> Together in purpose</div>
    <div class="stage-layer stage-note">♪</div>
    <div class="stage-layer stage-spark stage-star">✦</div>
    <div class="stage-ground"></div>
  </div>`;
}
