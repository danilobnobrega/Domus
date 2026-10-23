import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const ease = (t) => {
  // the house curve, cubic-bezier(.35,0,0,1), solved numerically
  t = clamp(t);
  let lo = 0,
    hi = 1,
    u = t;
  for (let i = 0; i < 18; i++) {
    u = (lo + hi) / 2;
    const x = 3 * (1 - u) * (1 - u) * u * 0.35 + 3 * (1 - u) * u * u * 0 + u * u * u;
    if (x < t) lo = u;
    else hi = u;
  }
  return 3 * (1 - u) * u * u + u * u * u;
};
export const inOut = (t) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export class Spring {
  constructor(v = 0, k = 90, c = 13) {
    this.v = v;
    this.t = v;
    this.vel = 0;
    this.k = k;
    this.c = c;
  }
  step(dt) {
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.vel += ((this.t - this.v) * this.k - this.vel * this.c) * h;
      this.v += this.vel * h;
    }
    return this.v;
  }
}

/*
 * One transparent canvas laid over the page. Every WebGL piece is a "view" bound to a DOM
 * element and drawn only inside that element's rectangle, so the DOM keeps the layout.
 */
export function createGL(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;

  const S = {
    renderer,
    w: 1,
    h: 1,
    dpr: 1,
    time: 0,
    touch: matchMedia('(hover: none)').matches,
    mobile: false,
    mouse: { x: 0.5, y: 0.5, px: -9999, py: -9999, seen: false },
    views: [],
  };

  S.resize = () => {
    const w = window.innerWidth,
      h = window.innerHeight;
    // phones: the address bar grows and shrinks while scrolling; keep the tallest height for
    // this width so nothing on the GPU is reallocated mid-scroll
    if (S.touch && w === S.w && h <= S.h && S.h - h < 220) return;
    const sameW = w === S.w;
    S.w = w;
    S.h = S.touch && sameW ? Math.max(h, S.h || 0) : h;
    S.mobile = S.w <= 900;
    S.dpr = Math.min(window.devicePixelRatio || 1, S.mobile ? 2 : 1.75);
    renderer.setPixelRatio(S.dpr);
    renderer.setSize(S.w, S.h, false);
    canvas.style.height = S.h + 'px';
    S.views.forEach((v) => v.resize?.());
  };

  S.add = (v) => {
    S.views.push(v);
    v.resize?.();
    return v;
  };
  S.remove = (v) => {
    S.views = S.views.filter((x) => x !== v);
    v.dispose?.();
  };
  S.clearViews = () => {
    S.views.forEach((v) => v.dispose?.());
    S.views = [];
  };

  S.render = (dt) => {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, S.w, S.h);
    renderer.clear();
    renderer.setScissorTest(true);
    for (const v of S.views) {
      const r = v.el.getBoundingClientRect();
      v.rect = r;
      const on = r.bottom > -2 && r.top < S.h + 2 && r.width > 0 && r.height > 0;
      v.update?.(r, on, dt);
      if (!on || v.hidden) continue;
      const top = Math.max(0, r.top);
      const bottom = Math.min(S.h, r.bottom);
      renderer.setViewport(r.left, S.h - r.bottom, r.width, r.height);
      renderer.setScissor(r.left, S.h - bottom, r.width, bottom - top);
      v.render(renderer);
    }
  };

  S.resize();
  return S;
}

// three.js colour management already stores hex colours in linear space
export const lin = (hex) => new THREE.Color(hex);
// for shaders that write display values directly
export const raw = (hex) => new THREE.Color(hex).convertLinearToSRGB();
