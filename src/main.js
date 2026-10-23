import Lenis from 'lenis';
import './style.css';
import { createGL } from './gl/core.js';
import { createVeil } from './veil.js';
import { reveals } from './ui.js';
import home from './pages/home.js';
import quem from './pages/quem.js';
import servicos from './pages/servicos.js';
import atuamos from './pages/atuamos.js';
import contato from './pages/contato.js';

const PAGES = [home, quem, servicos, atuamos, contato];
const find = (path) => PAGES.find((p) => p.path === path.replace(/\/+$/, '') || (p.path === '/' && (path === '' || path === '/'))) || home;

const S = createGL(document.getElementById('gl'));
const veil = createVeil(document.getElementById('veil'), document.querySelector('.veil__label'));
const appEl = document.getElementById('app');
const hdr = document.querySelector('.hdr');
const html = document.documentElement;

const lenis = S.touch ? null : new Lenis({ lerp: 0.1, smoothWheel: true });
window.__lenis = lenis || { scrollTo: (y) => window.scrollTo(0, y) };

// ── pointer
addEventListener(
  'pointermove',
  (e) => {
    S.mouse.px = e.clientX;
    S.mouse.py = e.clientY;
    S.mouse.x = e.clientX / innerWidth;
    S.mouse.y = e.clientY / innerHeight;
    S.mouse.seen = true;
  },
  { passive: true },
);

// ── pages
let current = null; // { page, ctl, cleanup, sections }
let busy = false;
const enterHooks = [];
const app = { onEnter: (fn) => enterHooks.push(fn) };

function mount(page) {
  enterHooks.length = 0;
  appEl.innerHTML = page.html();
  document.title = page.title;
  const cleanup = reveals(appEl);
  const ctl = page.mount(appEl, S, app);
  const sections = [...appEl.querySelectorAll('[data-theme]')];
  document.querySelectorAll('.hdr__nav a').forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === page.path));
  current = { page, ctl, cleanup, sections };
  hdr.classList.remove('is-hidden');
}

function unmount() {
  if (!current) return;
  current.ctl?.destroy?.();
  current.cleanup?.();
  S.clearViews();
  current = null;
}

function scrollTop(hash) {
  const target = hash ? appEl.querySelector(hash) : null;
  const y = target ? target.getBoundingClientRect().top + scrollY - 20 : 0;
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
}

async function go(url, push = true) {
  const u = new URL(url, location.href);
  const page = find(u.pathname);
  if (busy) return;
  if (current && current.page === page) {
    if (u.hash) {
      const t = appEl.querySelector(u.hash);
      if (t) lenis ? lenis.scrollTo(t, { offset: -20 }) : t.scrollIntoView({ behavior: 'smooth' });
    } else if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
    if (push) history.pushState({}, '', u.pathname + u.hash);
    closeMenu();
    return;
  }
  busy = true;
  html.classList.add('is-busy');
  lenis?.stop();
  await veil.close(page.label);
  closeMenu(true);
  if (push) history.pushState({}, '', u.pathname + u.hash);
  unmount();
  mount(page);
  scrollTop(u.hash);
  // a frame for layout, so the WebGL views are measured before they show
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  lenis?.start();
  const opening = veil.open();
  setTimeout(() => enterHooks.forEach((f) => f()), 280);
  await opening;
  html.classList.remove('is-busy');
  busy = false;
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || !href.startsWith('/') || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  go(href);
});
addEventListener('popstate', () => go(location.href, false));

// ── menu (phones)
const burger = document.querySelector('.hdr__burger');
function closeMenu(instant) {
  if (!html.classList.contains('menu-open')) return;
  html.classList.remove('menu-open');
  burger.setAttribute('aria-expanded', 'false');
  if (instant) {
    const m = document.querySelector('.menu');
    m.style.transition = 'none';
    requestAnimationFrame(() => (m.style.transition = ''));
  }
  lenis?.start();
}
burger.addEventListener('click', () => {
  const open = !html.classList.contains('menu-open');
  html.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  open ? lenis?.stop() : lenis?.start();
});

// ── header follows the colour of whatever is beneath it
function headerTone() {
  if (!current) return;
  const y = 36;
  let light = false;
  for (const s of current.sections) {
    const r = s.getBoundingClientRect();
    if (r.top <= y && r.bottom > y) {
      light = s.dataset.theme === 'light';
      break;
    }
  }
  hdr.classList.toggle('on-light', light && !html.classList.contains('menu-open'));
}

// ── the header steps aside while reading down and returns on the way up
let lastY = 0;
function headerHide() {
  const y = window.scrollY;
  const d = y - lastY;
  if (Math.abs(d) > 4) {
    hdr.classList.toggle('is-hidden', d > 0 && y > 120 && !html.classList.contains('menu-open'));
    lastY = y;
  }
}

// ── loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  S.time += dt;
  lenis?.raf(now);
  current?.ctl?.tick?.(dt);
  headerTone();
  headerHide();
  S.render(dt);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => S.resize());

// ── first load: the screen starts closed on the wordmark, then opens
(async () => {
  veil.set('cover');
  const label = document.querySelector('.veil__label');
  label.innerHTML = '<svg class="wordmark veil__word" viewBox="0 0 178 29"><use href="#wordmark"/></svg>';
  label.style.opacity = '1';
  label.style.transform = 'translate(-50%,-50%)';
  html.classList.add('is-busy');
  busy = true;
  mount(find(location.pathname));
  requestAnimationFrame(frame);
  if (location.hash) setTimeout(() => scrollTop(location.hash), 50);
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 1500));
  const opening = veil.open();
  setTimeout(() => enterHooks.forEach((f) => f()), 280);
  await opening;
  html.classList.remove('is-busy');
  busy = false;
})();
