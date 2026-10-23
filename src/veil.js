import { clamp, inOut } from './gl/core.js';

/*
 * The page change. Two half discs grow from the top and bottom edges of the screen, the
 * Domus mark at the scale of the window; they almost touch (for a beat the whole screen *is*
 * the mark), then close, the page underneath is swapped, and they open back to the edges.
 */

const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `
precision highp float;
uniform vec2 uRes;
uniform float uR;
uniform float uRim;
uniform float uDpr;
void main() {
  vec2 p = gl_FragCoord.xy;
  float cx = uRes.x * 0.5;
  float dTop = length(p - vec2(cx, uRes.y)) - uR;
  float dBot = length(p - vec2(cx, 0.0)) - uR;
  float d = min(dTop, dBot);
  float a = 1.0 - smoothstep(-uDpr, uDpr, d);
  // the stone is lit from above: a little lighter toward each flat edge, darker toward the arc
  float fromEdge = dTop < dBot ? (uRes.y - p.y) : p.y;
  float shade = clamp(fromEdge / max(uR, 1.0), 0.0, 1.0);
  vec3 col = mix(vec3(0.935, 0.905, 0.86), vec3(0.87, 0.835, 0.785), shade);
  // a thin warm rim on the arc while it moves
  float rim = exp(-abs(d) / (1.1 * uDpr)) * uRim;
  col = mix(col, vec3(0.96, 0.57, 0.54), clamp(rim, 0.0, 1.0) * 0.6);
  a = max(a, rim * 0.8);
  gl_FragColor = vec4(col * a, a);
}`;

export function createVeil(canvas, label) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  const sh = (t, s) => {
    const o = gl.createShader(t);
    gl.shaderSource(o, s);
    gl.compileShader(o);
    return o;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'),
    uR = U('uR'),
    uRim = U('uRim'),
    uDpr = U('uDpr');

  let W = 1,
    H = 1,
    dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(window.innerWidth * dpr);
    H = Math.round(window.innerHeight * dpr);
    canvas.width = W;
    canvas.height = H;
    canvas.style.height = window.innerHeight + 'px';
  };
  resize();
  window.addEventListener('resize', resize);

  // r is in units of the half height: 1 means the discs meet in the middle
  let r = 0,
    rim = 0;
  const cover = () => Math.hypot(W / 2, H / 2) / (H / 2) + 0.02;
  const draw = () => {
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (r <= 0.0005) {
      canvas.style.visibility = 'hidden';
      return;
    }
    canvas.style.visibility = 'visible';
    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uR, r * H * 0.5);
    gl.uniform1f(uRim, rim);
    gl.uniform1f(uDpr, dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const tween = (dur, fn) =>
    new Promise((res) => {
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / dur);
        fn(t);
        draw();
        if (t < 1) requestAnimationFrame(step);
        else res();
      };
      requestAnimationFrame(step);
    });

  const gapR = () => 1 - (0.17 / 2.17) * (window.innerWidth > window.innerHeight ? 1 : 0.5);

  return {
    set(v) {
      r = v === 'cover' ? cover() : v;
      draw();
    },
    // grow to the mark, hold, then close completely
    async close(text = '') {
      label.textContent = text;
      const g = gapR();
      await tween(640, (t) => {
        r = g * inOut(t);
        rim = Math.sin(t * Math.PI) * 0.9;
      });
      await tween(110, () => {});
      const c = cover();
      await tween(380, (t) => {
        r = g + (c - g) * (t * t);
        rim = (1 - t) * 0.4;
        label.style.opacity = String(clamp((t - 0.4) / 0.6));
        label.style.transform = `translate(-50%, ${-50 + (1 - t) * 30}%)`;
      });
    },
    async open() {
      const c = cover();
      await tween(200, (t) => {
        label.style.opacity = String(1 - t);
      });
      await tween(920, (t) => {
        const e = inOut(t);
        r = c * (1 - e);
        rim = Math.sin(t * Math.PI) * 0.6;
      });
      label.textContent = '';
    },
    resize,
  };
}
