import * as THREE from 'three';
import { Spring, clamp, raw, smooth } from './core.js';

/*
 * The rising bars of the Domus site, as a horizon that grows with time: each bar is a spring,
 * scroll raises them in a wave from left to right and the cursor lifts the ones beneath it.
 */

// heights read off the bars the Domus already uses
const HEIGHTS = [0.48, 0.58, 0.36, 0.74, 0.6, 0.34, 0.58, 0.72, 0.33, 0.54, 0.72, 0.38, 0.63, 0.84, 0.36, 0.73, 0.58];

const VERT = /* glsl */ `
attribute float aI;
attribute float aH;
uniform float uCell;
uniform float uBar;
uniform float uMaxH;
varying float vY;
varying float vTop;
varying vec2 vUv;
void main() {
  float h = aH * uMaxH;
  vec2 p = vec2((aI + 0.5) * uCell + position.x * uBar, (position.y + 0.5) * h);
  vY = p.y / uMaxH;
  vTop = h;
  vUv = vec2(position.x + 0.5, p.y);
  gl_Position = projectionMatrix * vec4(p, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uPeach;
uniform vec3 uCoral;
uniform vec3 uRose;
uniform float uTime;
uniform float uAlpha;
varying float vY;
varying float vTop;
varying vec2 vUv;
void main() {
  // the gradient belongs to the horizon, not to each bar: tall bars reach the light peach
  float t = clamp(vY / 0.85, 0.0, 1.0);
  vec3 col = mix(uRose, uCoral, smoothstep(0.0, 0.45, t));
  col = mix(col, uPeach, smoothstep(0.35, 1.0, t));
  // a soft light running across the faces
  float sheen = 0.5 + 0.5 * sin(vUv.x * 3.14159 + 0.0);
  col *= 0.94 + 0.06 * sheen;
  // the cut edge on top catches light
  float edge = smoothstep(2.5, 0.0, vTop - vUv.y);
  col = mix(col, vec3(1.0, 0.96, 0.92), edge * 0.35);
  gl_FragColor = vec4(col * uAlpha, uAlpha);
}`;

export function createBars(S, el) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  const n = HEIGHTS.length;
  const geo = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.instanceCount = n;
  const aI = new Float32Array(n).map((_, i) => i);
  const aH = new Float32Array(n);
  geo.setAttribute('aI', new THREE.InstancedBufferAttribute(aI, 1));
  const hAttr = new THREE.InstancedBufferAttribute(aH, 1);
  hAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aH', hAttr);
  const uniforms = {
    uCell: { value: 1 },
    uBar: { value: 1 },
    uMaxH: { value: 1 },
    uTime: { value: 0 },
    uAlpha: { value: 1 },
    uPeach: { value: raw('#facca8') },
    uCoral: { value: raw('#f6918a') },
    uRose: { value: raw('#f87084') },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, premultipliedAlpha: true, depthTest: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const springs = HEIGHTS.map(() => new Spring(0, 70, 9));
  const state = { rise: 0 };

  return {
    el,
    state,
    update(r, on, dt = 1 / 60) {
      const w = r.width,
        h = r.height;
      camera.left = 0;
      camera.right = w;
      camera.top = h;
      camera.bottom = 0;
      camera.updateProjectionMatrix();
      const cell = w / n;
      uniforms.uCell.value = cell;
      uniforms.uBar.value = cell * 0.82;
      uniforms.uMaxH.value = h;
      uniforms.uTime.value = S.time;
      const mx = S.mouse.px - r.left;
      const inY = S.mouse.py > r.top - h * 1.5 && S.mouse.py < r.bottom;
      for (let i = 0; i < n; i++) {
        // a wave from the left: each bar starts a little after its neighbour
        const k = smooth(i / n * 0.55, i / n * 0.55 + 0.45, state.rise);
        let t = HEIGHTS[i] * k;
        if (!S.touch && inY && k > 0.5) {
          const d = (mx - (i + 0.5) * cell) / (cell * 1.4);
          t += 0.14 * Math.exp(-d * d);
        }
        t += Math.sin(S.time * 0.8 + i * 0.7) * 0.012 * k;
        springs[i].t = clamp(t, 0, 1);
        aH[i] = Math.max(0, springs[i].step(Math.min(dt, 1 / 30)));
      }
      hAttr.needsUpdate = true;
    },
    render(renderer) {
      renderer.render(scene, camera);
    },
    dispose() {
      geo.dispose();
      base.dispose();
      mat.dispose();
    },
  };
}
