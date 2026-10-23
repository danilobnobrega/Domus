import * as THREE from 'three';
import { damp, raw } from './core.js';

/*
 * Three circles drawn as lines of light, the way the Domus explains itself: as a Venn whose
 * centre is the family's interest, or as a triad tied together by dashed links.
 * Everything is distance fields in one fragment shader; positions come in as CSS pixels.
 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uSize;
uniform vec2 uC0;
uniform vec2 uC1;
uniform vec2 uC2;
uniform float uR;
uniform float uDraw;
uniform float uFill;
uniform float uLink;
uniform float uMode;
uniform float uW;
uniform float uTime;
uniform float uAlpha;
uniform vec2 uMouse;
uniform vec3 uInk;
uniform vec3 uPeach;
uniform vec3 uCoral;
uniform vec3 uRose;
uniform float uGrad;
varying vec2 vUv;

const float TAU = 6.2831853;

vec3 grad(float t) {
  return t < 0.5 ? mix(uPeach, uCoral, t * 2.0) : mix(uCoral, uRose, t * 2.0 - 1.0);
}

// one ring: returns line coverage (x) and the glowing head of the stroke while it draws (y)
vec2 ring(vec2 p, vec2 c, float r, float prog, float phase, float seed) {
  vec2 q = p - c;
  float L = length(q);
  float ang = atan(q.y, q.x);
  // a faint, slow breathing of the radius, so the line feels drawn rather than computed
  r += sin(ang * 3.0 + uTime * 0.5 + seed) * 0.6 + sin(ang * 5.0 - uTime * 0.4 + seed * 2.0) * 0.35;
  float d = abs(L - r);
  float aa = max(fwidth(L), 0.5);
  float line = 1.0 - smoothstep(uW * 0.5, uW * 0.5 + aa, d);
  float a = fract(ang / TAU + phase);
  float m = prog >= 0.999 ? 1.0 : 1.0 - smoothstep(prog - 0.003, prog, a);
  float tip = prog > 0.001 && prog < 0.999 ? exp(-pow((a - prog) * r * TAU / 14.0, 2.0)) * exp(-d * d / 18.0) : 0.0;
  return vec2(line * m, tip);
}

float inside(vec2 p, vec2 c, float r) {
  float L = length(p - c);
  return 1.0 - smoothstep(r - 0.8, r + 0.8, L);
}

float seg(vec2 p, vec2 a, vec2 b, out float t) {
  vec2 pa = p - a, ba = b - a;
  t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t);
}

float link(vec2 p, vec2 a, vec2 b, float r, float prog) {
  vec2 dir = normalize(b - a);
  vec2 s = a + dir * r * 1.1;
  vec2 e = b - dir * r * 1.1;
  float t;
  float d = seg(p, s, e, t);
  float len = length(e - s);
  float dash = step(0.45, fract(t * len / 9.0));
  return (1.0 - smoothstep(0.7, 1.6, d)) * dash * step(t, prog);
}

void main() {
  vec2 p = vUv * uSize;
  float k = uDraw;
  vec2 r0 = ring(p, uC0, uR, k, 0.25, 0.0);
  vec2 r1 = ring(p, uC1, uR, k, 0.58, 1.7);
  vec2 r2 = ring(p, uC2, uR, k, 0.91, 3.1);
  float line = max(r0.x, max(r1.x, r2.x));
  float tip = r0.y + r1.y + r2.y;

  // the cursor is a lamp passing over the drawing
  vec2 dm = p - uMouse;
  float lamp = exp(-dot(dm, dm) / (2.0 * 150.0 * 150.0));

  float i0 = inside(p, uC0, uR), i1 = inside(p, uC1, uR), i2 = inside(p, uC2, uR);
  float core = i0 * i1 * i2;
  float pair = clamp(i0 * i1 + i0 * i2 + i1 * i2 - 3.0 * core, 0.0, 1.0);

  vec3 lineCol = mix(uInk, grad(clamp(vUv.x * 0.8 + vUv.y * 0.3, 0.0, 1.0)), uGrad);
  float la = clamp(line * (0.86 + 0.4 * lamp + 0.14 * uGrad) + tip * 0.9, 0.0, 1.0);

  vec3 col = vec3(0.0);
  float a = 0.0;
  if (uMode < 0.5) {
    // Venn: the lens shared by all three fills with the brand gradient
    float g = clamp((p.y - (uC2.y - uR * 0.2)) / (uR * 0.9), 0.0, 1.0);
    vec3 cc = grad(1.0 - g);
    float ca = core * uFill * (0.92 + 0.08 * sin(uTime * 1.3));
    float pa = pair * uFill * 0.06;
    col = cc * ca + uInk * pa;
    a = ca + pa;
  } else {
    float l = link(p, uC0, uC1, uR, uLink) + link(p, uC1, uC2, uR, uLink) + link(p, uC2, uC0, uR, uLink);
    l = clamp(l, 0.0, 1.0) * 0.8;
    col = grad(0.5) * l;
    a = l;
  }
  // line over fill
  col = col * (1.0 - la) + lineCol * la;
  a = a * (1.0 - la) + la;
  gl_FragColor = vec4(col * uAlpha, clamp(a, 0.0, 1.0) * uAlpha);
}`;

export function createRings(S, el, { mode = 'venn', ink = '#f7f0e5', gradient = false } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const uniforms = {
    uSize: { value: new THREE.Vector2(1, 1) },
    uC0: { value: new THREE.Vector2() },
    uC1: { value: new THREE.Vector2() },
    uC2: { value: new THREE.Vector2() },
    uR: { value: 10 },
    uDraw: { value: 0 },
    uFill: { value: 0 },
    uLink: { value: 0 },
    uMode: { value: mode === 'venn' ? 0 : 1 },
    uW: { value: 1.4 },
    uTime: { value: 0 },
    uAlpha: { value: 1 },
    uMouse: { value: new THREE.Vector2(-9999, -9999) },
    uInk: { value: raw(ink) },
    uPeach: { value: raw('#facca8') },
    uCoral: { value: raw('#f6918a') },
    uRose: { value: raw('#f87084') },
    uGrad: { value: gradient ? 1 : 0 },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  quad.frustumCulled = false;
  scene.add(quad);

  // state a page drives: draw (stroke progress), spread (0 apart … 1 composed), fill, link, spin
  const state = { draw: 0, spread: 1, fill: 0, link: 0, spin: 0, alpha: 1 };
  const cur = { ...state };
  const labels = [];
  let mouse = { x: -9999, y: -9999 };

  const view = {
    el,
    state,
    labels,
    centers: [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()],
    radius: 0,
    update(r, on, dt = 1 / 60) {
      for (const k in state) cur[k] = damp(cur[k], state[k], k === 'draw' ? 6 : 4.5, dt);
      const w = r.width,
        h = r.height;
      uniforms.uSize.value.set(w, h);
      const s = Math.min(w, h);
      // composed layout: Venn rings overlap, triad circles sit apart
      const R = mode === 'venn' ? s * 0.235 : s * 0.185;
      const d = mode === 'venn' ? R * 0.68 : s * 0.285;
      const spread = mode === 'venn' ? 1 + (1 - cur.spread) * 0.9 : 1;
      const rot = cur.spin;
      const cx = w / 2,
        cy = h / 2;
      for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + (i * Math.PI * 2) / 3 + rot;
        this.centers[i].set(cx + Math.cos(a) * d * spread, cy + Math.sin(a) * d * spread);
      }
      this.radius = R * (mode === 'venn' ? 0.75 + 0.25 * cur.spread : 1);
      uniforms.uC0.value.copy(this.centers[0]);
      uniforms.uC1.value.copy(this.centers[1]);
      uniforms.uC2.value.copy(this.centers[2]);
      uniforms.uR.value = this.radius;
      uniforms.uDraw.value = cur.draw;
      uniforms.uFill.value = cur.fill;
      uniforms.uLink.value = cur.link;
      uniforms.uAlpha.value = cur.alpha;
      uniforms.uTime.value = S.time;
      uniforms.uW.value = S.mobile ? 1.2 : 1.4;
      const tx = S.mouse.px - r.left,
        ty = h - (S.mouse.py - r.top);
      mouse.x = damp(mouse.x < -9000 ? tx : mouse.x, tx, 6, dt);
      mouse.y = damp(mouse.y < -9000 ? ty : mouse.y, ty, 6, dt);
      uniforms.uMouse.value.set(S.touch ? -9999 : mouse.x, S.touch ? -9999 : mouse.y);
      // DOM labels follow the circles (y flipped back to CSS)
      for (const L of labels) {
        const p = L.at(this.centers, this.radius, w, h);
        L.el.style.left = p.x + 'px';
        L.el.style.top = h - p.y + 'px';
      }
    },
    render(renderer) {
      if (cur.alpha < 0.002) return;
      renderer.render(scene, camera);
    },
    dispose() {
      quad.geometry.dispose();
      mat.dispose();
    },
  };
  return view;
}
