import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { damp, lin, clamp } from './core.js';

/*
 * The Domus mark in stone: two half discs, the upper one hanging from a flat top, the lower
 * one standing on a flat base, a thin gap between them. Lit by hand in the shader (no three.js
 * lights, they are expensive on phones); the cursor carries the key light.
 */

const GAP = 0.17;
const DEPTH = 0.34;

function halfDisc() {
  // the outline of the lower half of a unit disc, with tiny fillets where the arc meets the
  // flat edge so normals stay smooth everywhere
  const f = 0.045;
  const cx = Math.sqrt((1 - f) * (1 - f) - f * f);
  const N = 160;
  const t0 = Math.atan2(-f, cx); // where the right fillet meets the big arc
  // right fillet, from the flat edge down onto the arc
  const fillet = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + (t0 - Math.PI / 2) * (i / 10);
    fillet.push(new THREE.Vector2(cx + Math.cos(a) * f, -f + Math.sin(a) * f));
  }
  const pts = [...fillet];
  // big arc, right to left through the bottom
  for (let i = 1; i < N; i++) {
    const a = t0 - (Math.PI + 2 * t0) * (i / N);
    pts.push(new THREE.Vector2(Math.cos(a), Math.sin(a)));
  }
  // left fillet: the right one mirrored, walked back up to the flat edge
  for (let i = fillet.length - 1; i >= 0; i--) pts.push(new THREE.Vector2(-fillet[i].x, fillet[i].y));
  const shape = new THREE.Shape(pts);
  let g = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 6, curveSegments: 1 });
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  g.translate(0, 0, -DEPTH / 2);
  return g;
}

const VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
varying vec3 vO;
void main() {
  vO = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uAlbedo;
uniform vec3 uKey;
uniform vec3 uKeyCol;
uniform vec3 uRimCol;
uniform vec3 uEnvTop;
uniform vec3 uEnvBot;
uniform vec3 uCam;
uniform float uRough;
uniform float uSpec;
uniform float uSpeck;
uniform float uGapY;
uniform float uGapAO;
uniform float uAlpha;
varying vec3 vN;
varying vec3 vW;
varying vec3 vO;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(uCam - vW);

  // honed stone: slow clouding, a fine grain, and rare darker flecks
  float cloud = noise(vO * 2.3) * 0.55 + noise(vO * 6.7) * 0.3 + noise(vO * 19.0) * 0.15;
  float fleck = smoothstep(0.82, 0.88, noise(vO * 74.0 + 3.1));
  vec3 alb = uAlbedo * (0.93 + cloud * 0.12) * (1.0 - fleck * uSpeck);

  // the grain also roughens the normal a touch, so highlights break up like on real stone
  vec3 gn = vec3(noise(vO * 90.0), noise(vO * 90.0 + 7.0), noise(vO * 90.0 + 13.0)) - 0.5;
  n = normalize(n + gn * 0.05);

  vec3 l = normalize(uKey);
  float nl = dot(n, l);
  float diff = clamp((nl + 0.35) / 1.35, 0.0, 1.0);
  diff *= diff;

  vec3 h = normalize(l + v);
  float nh = max(dot(n, h), 0.0);
  float a2 = pow(uRough, 4.0);
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float ggx = a2 / (3.14159 * dd * dd);
  float nv = max(dot(n, v), 0.0);
  float fr = pow(1.0 - nv, 5.0);

  vec3 r = reflect(-v, n);
  vec3 env = mix(uEnvBot, uEnvTop, smoothstep(-0.5, 0.9, r.y));
  float sky = n.y * 0.5 + 0.5;

  // the two halves shade each other where they almost touch
  float ao = 1.0 - uGapAO * exp(-abs(vW.y - uGapY) * 3.2) * (0.6 + 0.4 * (1.0 - abs(n.y)));

  vec3 col = alb * (diff * uKeyCol + mix(uEnvBot, uEnvTop, sky) * 0.38) * ao;
  col += uKeyCol * ggx * uSpec * mix(0.04, 1.0, fr) * (0.3 + 0.7 * cloud);
  col += env * fr * 0.35;
  // a warm rim from behind the stone
  vec3 back = normalize(vec3(-l.x, 0.25, -0.8));
  col += uRimCol * pow(1.0 - nv, 2.5) * max(dot(n, back), 0.0) * 0.9;

  // filmic shoulder + display gamma
  col = col / (1.0 + col * 0.18);
  col = pow(col, vec3(1.0 / 2.2));
  gl_FragColor = vec4(col * uAlpha, uAlpha);
}`;

const TONES = {
  // cream stone over graphite
  cream: { albedo: '#ebe4d9', key: '#fff4e8', rim: '#f6a58f', top: '#5a5550', bot: '#1d1c1c', rough: 0.4, spec: 0.6, speck: 0.16, keyI: 2.9 },
  // graphite stone over sand
  ink: { albedo: '#2c2a29', key: '#fff6ea', rim: '#f4c3a4', top: '#e9dfd3', bot: '#3a3532', rough: 0.36, spec: 0.9, speck: -0.6, keyI: 2.2 },
};

export function createMark(S, el, { tone = 'cream', shadow = false } = {}) {
  const T = TONES[tone];
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 9);

  const uniforms = {
    uAlbedo: { value: lin(T.albedo) },
    uKey: { value: new THREE.Vector3(-0.6, 0.7, 0.8) },
    uKeyCol: { value: lin(T.key).multiplyScalar(T.keyI) },
    uRimCol: { value: lin(T.rim) },
    uEnvTop: { value: lin(T.top) },
    uEnvBot: { value: lin(T.bot) },
    uCam: { value: camera.position },
    uRough: { value: T.rough },
    uSpec: { value: T.spec },
    uSpeck: { value: T.speck },
    uGapY: { value: 0 },
    uGapAO: { value: 0.35 },
    uAlpha: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, premultipliedAlpha: true, depthWrite: true });
  const geo = halfDisc();

  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);
  const topPivot = new THREE.Group();
  const botPivot = new THREE.Group();
  const top = new THREE.Mesh(geo, mat);
  const bot = new THREE.Mesh(geo, mat);
  bot.rotation.z = Math.PI;
  topPivot.add(top);
  botPivot.add(bot);
  spin.add(topPivot, botPivot);
  scene.add(root);

  // a soft contact shadow for the light tone, which stands on a surface
  let shadowMesh = null;
  if (shadow) {
    const sm = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      premultipliedAlpha: true,
      uniforms: { uA: { value: 0.22 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader:
        'precision highp float; uniform float uA; varying vec2 vUv; void main(){ vec2 q = (vUv - .5) * vec2(2., 2.); float d = dot(q,q); float a = exp(-d * 3.2) * uA; gl_FragColor = vec4(vec3(.12,.1,.09) * a, a); }',
    });
    shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.7), sm);
    shadowMesh.renderOrder = -1;
    scene.add(shadowMesh);
  }

  // pose: everything a page can drive; the view eases toward it
  const pose = { x: 0, y: 0, s: 1, open: 0, spin: 0, tilt: 0, close: 0, alpha: 1 };
  const cur = { ...pose };
  const look = { x: 0, y: 0 };

  const view = {
    el,
    pose,
    scene,
    camera,
    snap() {
      Object.assign(cur, pose);
    },
    // world size of the view at the mark's depth
    get worldH() {
      return 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    },
    get worldW() {
      return this.worldH * camera.aspect;
    },
    resize() {
      const r = el.getBoundingClientRect();
      camera.aspect = Math.max(0.01, r.width / Math.max(1, r.height));
      camera.updateProjectionMatrix();
    },
    update(r, on, dt = 1 / 60) {
      if (!on) return;
      const a = r.width / Math.max(1, r.height);
      if (Math.abs(a - camera.aspect) > 1e-3) {
        camera.aspect = a;
        camera.updateProjectionMatrix();
      }
      for (const k in pose) cur[k] = damp(cur[k], pose[k], k === 'open' || k === 'close' ? 7 : 5, dt);

      // the cursor tilts the stone a little and carries the key light
      const m = S.mouse;
      const mx = S.touch ? Math.sin(S.time * 0.35) * 0.5 : (m.x - 0.5) * 2;
      const my = S.touch ? Math.cos(S.time * 0.27) * 0.3 : (m.y - 0.5) * 2;
      look.x = damp(look.x, mx, 2.5, dt);
      look.y = damp(look.y, my, 2.5, dt);
      uniforms.uKey.value.set(-0.35 + look.x * 1.1, 0.75 - look.y * 0.8, 0.85).normalize();

      const gap = GAP * (1 - cur.close);
      const o = cur.open;
      root.position.set(cur.x, cur.y, 0);
      root.scale.setScalar(cur.s * (1 + Math.max(0, o) * 0.18));
      spin.rotation.set(cur.tilt + look.y * 0.12, cur.spin + look.x * 0.22, 0);
      topPivot.position.y = 1 + gap / 2 + o * 0.95;
      botPivot.position.y = -1 - gap / 2 - o * 0.95;
      topPivot.rotation.x = -o * 0.42;
      botPivot.rotation.x = o * 0.42;
      uniforms.uGapY.value = root.position.y;
      uniforms.uGapAO.value = 0.4 * clamp(1 - o * 2);
      uniforms.uAlpha.value = cur.alpha;
      if (shadowMesh) {
        const sc = cur.s;
        shadowMesh.position.set(cur.x, cur.y - (1 + gap / 2 + o * 0.95 + 1.0) * sc * 1.0 - 0.06 * sc, -1);
        shadowMesh.scale.set(sc * (1 + o * 0.2), sc, 1);
        shadowMesh.material.uniforms.uA.value = 0.24 * cur.alpha * clamp(1 - o);
      }
    },
    render(renderer) {
      if (cur.alpha < 0.002) return;
      renderer.render(scene, camera);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      shadowMesh?.geometry.dispose();
      shadowMesh?.material.dispose();
    },
  };
  return view;
}
