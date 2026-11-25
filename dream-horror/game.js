/* HOLLOW LULLABY — a first-person 3D dream horror. Everything (textures, audio, models) is procedural. */
(() => {
'use strict';
const T = THREE;
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[(Math.random() * a.length) | 0];

/* ───────────────────────── renderer + post-process ───────────────────────── */
const canvas = $('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: false });
renderer.outputColorSpace = T.LinearSRGBColorSpace;
if ('useLegacyLights' in renderer) renderer.useLegacyLights = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const scene = new T.Scene();
scene.fog = new T.FogExp2(0x050508, 0.1);
scene.background = new T.Color(0x050508);
const camera = new T.PerspectiveCamera(72, 1, 0.05, 160);
camera.rotation.order = 'YXZ';
scene.add(camera);

const rt = new T.WebGLRenderTarget(4, 4, { minFilter: T.LinearFilter, magFilter: T.LinearFilter });
const post = {
  scene: new T.Scene(),
  cam: new T.OrthographicCamera(-1, 1, 1, -1, 0, 1),
  mat: new T.ShaderMaterial({
    uniforms: { t: { value: rt.texture }, time: { value: 0 }, insan: { value: 0 }, flash: { value: 0 }, eye: { value: 0 }, fade: { value: 1 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `
      uniform sampler2D t; uniform float time,insan,flash,eye,fade; varying vec2 vUv;
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){
        vec2 c=vUv-.5; float d=length(c);
        vec2 uv=vUv + insan*.010*vec2(sin(vUv.y*18.+time*1.7),cos(vUv.x*14.+time*1.3));
        uv=.5+(uv-.5)*(1.-insan*.10*d*d*4.);
        float ab=.0015+insan*.010+flash*.02;
        vec3 col; col.r=texture2D(t,uv+c*ab).r; col.g=texture2D(t,uv).g; col.b=texture2D(t,uv-c*ab).b;
        float g=dot(col,vec3(.3,.59,.11)); col=mix(col,vec3(g)*vec3(1.,.95,.9),insan*.55);
        col*=mix(.28,1.,smoothstep(.9,.22,d*(1.+insan*.7)));
        col+=(h(uv*vec2(1100.,900.)+time)-.5)*(.06+insan*.10);
        col=mix(col,vec3(1.),clamp(flash,0.,1.));
        float edge=(1.-eye)*.56;
        col*=1.-smoothstep(edge-.10,edge,abs(c.y));
        col*=fade;
        gl_FragColor=vec4(col,1.);
      }`,
    depthTest: false, depthWrite: false,
  }),
};
post.scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), post.mat));
function resize() {
  const w = window.innerWidth, h = window.innerHeight, pr = renderer.getPixelRatio();
  renderer.setSize(w, h, false);
  rt.setSize(Math.max(2, (w * pr) | 0), Math.max(2, (h * pr) | 0));
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

/* ───────────────────────── procedural textures ───────────────────────── */
function mkCanvas(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); fn(g, w, h);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
}
function noise(g, w, h, amt) {
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(id, 0, 0);
}
const texCache = {};
function texWall(a, b) {
  const k = 'w' + a + b; if (texCache[k]) return texCache[k];
  return texCache[k] = mkCanvas(256, 256, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    g.fillStyle = b; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 14, h);
    g.globalAlpha = .25; g.fillStyle = '#000';
    for (let i = 0; i < 6; i++) { const x = rnd(0, w), y = rnd(0, h), r = rnd(20, 60); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(20,10,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.globalAlpha = .12; g.fillStyle = '#000'; for (let y = 16; y < h; y += 32) for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
    g.globalAlpha = 1; noise(g, w, h, 18);
  });
}
function texWood(dark) {
  const k = 'f' + dark; if (texCache[k]) return texCache[k];
  return texCache[k] = mkCanvas(256, 256, (g, w, h) => {
    for (let i = 0; i < 8; i++) { const l = (dark ? 14 : 24) + rnd(-4, 5); g.fillStyle = `hsl(${rnd(20, 30)},35%,${l}%)`; g.fillRect(0, i * 32, w, 32); g.fillStyle = '#000'; g.globalAlpha = .6; g.fillRect(0, i * 32, w, 2); g.globalAlpha = 1; }
    g.globalAlpha = .3; g.strokeStyle = '#000'; for (let i = 0; i < 40; i++) { const y = rnd(0, h); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + rnd(-4, 4), 160, y + rnd(-4, 4), w, y); g.stroke(); }
    g.globalAlpha = 1; noise(g, w, h, 22);
  });
}
function texNoise(base, amt) {
  const k = 'n' + base + amt; if (texCache[k]) return texCache[k];
  return texCache[k] = mkCanvas(128, 128, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); noise(g, w, h, amt); });
}
function texMoonWindow() {
  return mkCanvas(128, 160, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d1230'); gr.addColorStop(1, '#2a3a6a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8ecff'; g.beginPath(); g.arc(78, 50, 26, 0, 7); g.fill();
    g.fillStyle = '#9aa6d0'; [[70, 44, 6], [86, 58, 5], [80, 38, 3]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    g.fillStyle = '#0a0a14'; g.fillRect(0, 120, w, 40);
    // a figure on the horizon that should not be there
    g.fillRect(30, 70, 5, 50); g.beginPath(); g.arc(32.5, 66, 5, 0, 7); g.fill();
  });
}
function texPortrait(variant, seed) {
  return mkCanvas(128, 160, (g, w, h) => {
    g.fillStyle = ['#3a2c22', '#2c2a2a', '#241a1a'][variant] || '#3a2c22'; g.fillRect(0, 0, w, h);
    const n = 3 + (seed % 2);
    for (let i = 0; i < n; i++) {
      const x = (i + .5) * w / n, hh = 28 + (i % 2) * 10;
      g.fillStyle = '#16100d'; g.fillRect(x - 17, h - 60, 34, 60);
      g.fillStyle = variant === 0 ? '#c9b49a' : '#bdb2a5'; g.beginPath(); g.ellipse(x, h - 70 - hh * .2, 12, 16, 0, 0, 7); g.fill();
      if (variant === 0) { g.fillStyle = '#2a1d16'; g.fillRect(x - 6, h - 76, 3, 3); g.fillRect(x + 3, h - 76, 3, 3); g.fillRect(x - 4, h - 66, 8, 2); }
      if (variant === 1) { g.strokeStyle = '#150808'; g.lineWidth = 2; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x - 12 + rnd(-3, 3), h - 90 + k * 5); g.lineTo(x + 12 + rnd(-3, 3), h - 82 + k * 5 + rnd(-6, 6)); g.stroke(); } }
      if (variant === 2) { g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, h - 70, 9, 13, 0, 0, 7); g.fill(); g.fillStyle = '#f4efe0'; g.fillRect(x - 6, h - 74, 3, 5); g.fillRect(x + 3, h - 74, 3, 5); }
    }
    g.globalAlpha = .5; noise(g, w, h, 25);
  });
}
function texChecker() {
  return mkCanvas(128, 128, (g, w, h) => { g.fillStyle = '#16151c'; g.fillRect(0, 0, w, h); g.fillStyle = '#23212c'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); noise(g, w, h, 14); });
}
function texBrick() {
  return mkCanvas(128, 128, (g, w, h) => { g.fillStyle = '#2a1512'; g.fillRect(0, 0, w, h); g.strokeStyle = '#0c0605'; g.lineWidth = 3; for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); } } noise(g, w, h, 30); });
}

/* ───────────────────────── audio (procedural) ───────────────────────── */
const A = {
  ctx: null, hb: 0, box: null, detune: 0, ready: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C();
    this.out = c.createGain(); this.out.gain.value = .9;
    const comp = c.createDynamicsCompressor(); this.out.connect(comp); comp.connect(c.destination);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.nb = nb;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    this.drone = c.createGain(); this.drone.gain.value = 0; lp.connect(this.drone); this.drone.connect(this.out);
    [[43, 'sine', .5], [43.7, 'sine', .5], [86.4, 'sawtooth', .07], [64.5, 'triangle', .15]].forEach(([f, ty, g]) => {
      const o = c.createOscillator(); o.type = ty; o.frequency.value = f; const gg = c.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(lp); o.start();
    });
    const loopNoise = (freq, q) => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.out); s.start(); return { f, g }; };
    this.wh = loopNoise(1900, 4); this.sc = loopNoise(700, 1.6); this.wind = loopNoise(300, .7);
    this.ready = true;
  },
  now() { return this.ctx.currentTime; },
  tone(f, dur, vol, type = 'sine', delay = 0, to = null) {
    if (!this.ready) return; const c = this.ctx, t = this.now() + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + .05);
  },
  burst(freq, q, dur, vol, type = 'bandpass', delay = 0) {
    if (!this.ready) return; const c = this.ctx, t = this.now() + delay;
    const s = c.createBufferSource(); s.buffer = this.nb; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random()); s.stop(t + dur + .05);
  },
  step(kind) {
    if (kind === 'water') { this.burst(rnd(500, 900), 1.2, .35, .22); this.burst(180, .8, .3, .12); }
    else if (kind === 'tile') this.burst(rnd(1400, 2000), 3, .08, .12);
    else { this.burst(rnd(220, 340), 1.5, .12, .22, 'lowpass'); this.burst(rnd(1600, 2400), 4, .03, .05); }
  },
  thump(v = .5) { this.tone(70, .18, v, 'sine', 0, 36); },
  creak(dur = 1.4, vol = .06) { this.tone(rnd(90, 140), dur, vol, 'sawtooth', 0, rnd(160, 240)); this.burst(700, 6, dur * .6, vol * .6); },
  slam() { this.burst(120, .8, .5, .7, 'lowpass'); this.thump(.8); },
  sting(v = 1) { this.burst(200, .5, 1.3, .5 * v, 'lowpass'); [233, 247, 349, 370].forEach((f, i) => this.tone(f, 1.8, .09 * v, 'sawtooth', i * .01)); this.tone(60, 1.6, .5 * v, 'sine', 0, 28); },
  whisperBurst(v = .08) { if (!this.ready) return; const g = this.wh.g.gain, t = this.now(); this.wh.f.frequency.setValueAtTime(rnd(1200, 3200), t); g.cancelScheduledValues(t); g.setValueAtTime(0, t); g.linearRampToValueAtTime(v, t + .25); g.linearRampToValueAtTime(0, t + rnd(.8, 1.8)); },
  startBox(vol = .15) { this.box = { i: 0, t: 0, vol, on: true }; },
  stopBox() { if (this.box) this.box.on = false; },
  update(dt, st) {
    if (!this.ready) return;
    const t = this.now();
    this.drone.gain.setTargetAtTime(.10 + st.insan * .22, t, .3);
    this.sc.g.gain.setTargetAtTime(st.scrape, t, .05);
    this.sc.f.frequency.setTargetAtTime(500 + st.insan * 500, t, .2);
    this.wind.g.gain.setTargetAtTime(st.wind, t, .5);
    this.hb -= dt;
    if (this.hb <= 0) { this.thump(.18 + st.tension * .5); setTimeout(() => this.thump(.1 + st.tension * .3), 170); this.hb = 60 / (52 + st.tension * 100); }
    if (this.box && this.box.on) {
      this.box.t -= dt;
      if (this.box.t <= 0) {
        const seq = [0, 3, 7, 12, 7, 3, 0, 2, 5, 9, 5, 2, 0, 3, 7, 10, 7, 3, 2, 5, 7, 5, 3, 0];
        const n = seq[this.box.i++ % seq.length], det = 1 + (Math.random() - .5) * st.insan * .06 - st.insan * .02;
        this.tone(330 * Math.pow(2, n / 12) * det, 1.4, this.box.vol, 'triangle'); this.tone(660 * Math.pow(2, n / 12) * det, .6, this.box.vol * .3, 'sine');
        this.box.t = .38 + st.insan * .05;
        if (this.box.i >= seq.length * (this.box.loops || 1)) this.box.on = false;
      }
    }
    if (st.insan > .35 && Math.random() < dt * st.insan * .35) this.whisperBurst(.03 + st.insan * .08);
  },
};

/* ───────────────────────── state ───────────────────────── */
const keys = {};
const S = {
  running: false, paused: false, time: 0, chapter: -1, sanity: 1, insanBase: 0, spike: 0, flash: 0, fade: 1, fadeTarget: 1,
  eye: 0, flashlightOn: true, scrape: 0, wind: 0, tension: 0, input: true, fovKick: 0, shake: 0, wading: false,
};
const player = { x: 0, z: 0, yaw: 0, pitch: 0, bob: 0, lastStep: 0, r: 0.32, vx: 0, vz: 0 };
const colliders = [], interactables = [], updaters = [];
let world = new T.Group(); scene.add(world);
let currentCh = null;

const amb = new T.AmbientLight(0x404060, .5); scene.add(amb);
const moon = new T.DirectionalLight(0x6070b0, 0); moon.position.set(-3, 6, 2); scene.add(moon);
const lamp = new T.PointLight(0xffd9a0, 0, 12, 1.6); scene.add(lamp);
const torch = new T.SpotLight(0xfff0d0, 1.7, 24, .5, .6, 1.4); camera.add(torch); camera.add(torch.target); torch.target.position.set(0, 0, -6);

/* ───────────────────────── ui helpers ───────────────────────── */
let subTimer = 0;
function say(text, ms = 4200) {
  const el = $('sub'); el.textContent = text; el.classList.add('on');
  clearTimeout(subTimer); subTimer = setTimeout(() => el.classList.remove('on'), ms);
}
function card(small, big) {
  const el = $('card'); el.querySelector('small').textContent = small; el.querySelector('b').textContent = big;
  el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 4200);
}
const later = (ms, fn) => setTimeout(() => { if (S.chapter >= 0) fn(); }, ms);

/* ───────────────────────── world building ───────────────────────── */
function clearWorld() {
  scene.remove(world);
  world.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
  world = new T.Group(); scene.add(world);
  colliders.length = 0; interactables.length = 0; updaters.length = 0;
}
function mat(opts) { return new T.MeshLambertMaterial(opts); }
function tmat(tex, rx, ry, extra = {}) { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return mat(Object.assign({ map: t }, extra)); }
function box(w, h, d, x, y, z, m, col = true, parent = world) {
  const me = new T.Mesh(new T.BoxGeometry(w, h, d), m); me.position.set(x, y, z); parent.add(me);
  if (col) colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, on: true });
  return me;
}
function slab(w, d, x, y, z, tex, rep = 2.2) { return box(w, .2, d, x, y - .1, z, tmat(tex, w / rep, d / rep), false); }
function wallBox(w, h, d, x, z, m) { return box(w, h, d, x, h / 2, z, m, true); }
function pointLight(color, intensity, dist, x, y, z) { const l = new T.PointLight(color, intensity, dist, 1.6); l.position.set(x, y, z); world.add(l); return l; }
function cyl(rt, rb, h, x, y, z, m, seg = 10, parent = world) { const me = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), m); me.position.set(x, y, z); parent.add(me); return me; }
function sph(r, x, y, z, m, parent = world) { const me = new T.Mesh(new T.SphereGeometry(r, 12, 10), m); me.position.set(x, y, z); parent.add(me); return me; }

function makeDoor(x, z, w, h, hingeLeft, rotY, color = 0x3a2a20) {
  const pivot = new T.Group(); pivot.position.set(x, 0, z); pivot.rotation.y = rotY; world.add(pivot);
  const d = new T.Mesh(new T.BoxGeometry(w, h, .07), mat({ map: texWood(true), color }));
  d.position.set(hingeLeft ? w / 2 : -w / 2, h / 2, 0); pivot.add(d);
  const knob = sph(.04, hingeLeft ? w - .12 : -w + .12, h * .46, .06, mat({ color: 0xb59a5a }), pivot);
  return { pivot, angle: 0, target: 0, speed: 3, base: rotY, dir: hingeLeft ? 1 : -1, mesh: d };
}
function animateDoor(dr, dt) { dr.angle += clamp(dr.target - dr.angle, -dr.speed * dt, dr.speed * dt); dr.pivot.rotation.y = dr.base + dr.angle * dr.dir; }

/* Collision (circle vs AABB) and line-of-sight */
function resolve(p, r) {
  for (const c of colliders) {
    if (!c.on) continue;
    const nx = clamp(p.x, c.x0, c.x1), nz = clamp(p.z, c.z0, c.z1), dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-6) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
      else { const l = p.x - c.x0, rr = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, rr, t, b); if (m === l) p.x = c.x0 - r; else if (m === rr) p.x = c.x1 + r; else if (m === t) p.z = c.z0 - r; else p.z = c.z1 + r; }
    }
  }
}
function losBlocked(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  for (const c of colliders) {
    if (!c.on || c.noLos) continue;
    let t0 = 0, t1 = 1, ok = true;
    for (const [o, dd, lo, hi] of [[ax, dx, c.x0, c.x1], [az, dz, c.z0, c.z1]]) {
      if (Math.abs(dd) < 1e-9) { if (o < lo || o > hi) { ok = false; break; } }
      else { let a = (lo - o) / dd, b = (hi - o) / dd; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) { ok = false; break; } }
    }
    if (ok) return true;
  }
  return false;
}
function fwdVec() { return { x: -Math.sin(player.yaw) * Math.cos(player.pitch), y: Math.sin(player.pitch), z: -Math.cos(player.yaw) * Math.cos(player.pitch) }; }
function canSee(x, y, z, maxD = 40, cone = .5) {
  if (S.eye > .5) return false;
  const dx = x - player.x, dy = y - camera.position.y, dz = z - player.z, d = Math.hypot(dx, dy, dz);
  if (d > maxD) return false; const f = fwdVec();
  if ((dx * f.x + dy * f.y + dz * f.z) / d < cone) return false;
  return !losBlocked(player.x, player.z, x, z);
}

/* ───────────────────────── the Watcher ───────────────────────── */
function makeWatcher(scale = 1) {
  const g = new T.Group();
  const skin = mat({ color: 0xd9d3c8, emissive: 0x1c1a18 }), dark = mat({ color: 0x0b0a0c, emissive: 0x020202 });
  cyl(.07, .09, 1.15, -.1, .6, 0, skin, 6, g); cyl(.07, .09, 1.15, .1, .6, 0, skin, 6, g);
  const dress = cyl(.2, .5, 1.5, 0, 1.4, 0, dark, 10, g);
  cyl(.15, .2, .8, 0, 2.05, 0, skin, 8, g);
  const head = new T.Group(); head.position.set(0, 2.55, 0); g.add(head);
  const hh = sph(.17, 0, 0, 0, skin, head); hh.scale.set(.85, 1.35, .9);
  const slit = new T.Mesh(new T.PlaneGeometry(.025, .16), new T.MeshBasicMaterial({ color: 0x000000 })); slit.position.set(0, -.07, .155); head.add(slit);
  const arms = [];
  [-1, 1].forEach(s => { const a = new T.Group(); a.position.set(s * .24, 2.3, 0); const c = cyl(.04, .03, 1.45, 0, -.72, 0, skin, 6, a); g.add(a); arms.push(a); });
  head.rotation.z = .18; g.scale.setScalar(scale); g.userData = { head, arms };
  return g;
}
const watcher = { g: null, active: false, speed: 1, seen: false, still: 0 };
function spawnWatcher(x, z, speed) {
  if (watcher.g) world.remove(watcher.g);
  watcher.g = makeWatcher(); watcher.g.position.set(x, 0, z); world.add(watcher.g); watcher.active = true; watcher.speed = speed; watcher.seen = false;
}
function updateWatcher(dt, catchFn) {
  const w = watcher; if (!w.active || !w.g) return;
  const g = w.g, dx = player.x - g.position.x, dz = player.z - g.position.z, d = Math.hypot(dx, dz);
  w.seen = canSee(g.position.x, 1.5, g.position.z, 45, .45) || canSee(g.position.x, 2.4, g.position.z, 45, .45);
  const ang = Math.atan2(dx, dz); g.rotation.y = ang;
  const u = g.userData; const t = S.time;
  if (w.seen) {
    S.scrape = lerp(S.scrape, 0, dt * 10);
    S.sanity -= dt * clamp(.045 + (14 - d) * .006, .02, .12);
    S.spike = Math.max(S.spike, clamp((12 - d) / 12, 0, .6));
    u.head.rotation.z = .18 + Math.sin(t * 40) * .02;
  } else {
    const sp = w.speed * (S.eye > .5 ? 1.7 : 1);
    const p = { x: g.position.x + dx / d * sp * dt, z: g.position.z + dz / d * sp * dt };
    resolve(p, .4); g.position.x = p.x; g.position.z = p.z;
    S.scrape = lerp(S.scrape, clamp(.35 - d * .012, .05, .35), dt * 6);
    u.head.rotation.z = .18 + Math.sin(t * 9) * .12; u.head.rotation.x = Math.sin(t * 7.3) * .1;
    u.arms.forEach((a, i) => a.rotation.z = (i ? -1 : 1) * (.1 + Math.sin(t * 5 + i) * .1));
    if (d > 38) { g.position.x = player.x + Math.sin(ang + Math.PI) * 20; g.position.z = player.z + Math.cos(ang + Math.PI) * 20; }
  }
  S.tension = Math.max(S.tension, clamp(1 - d / 16, 0, 1));
  if (d < 1.0) catchFn();
}

/* hallucination: a figure at the edge of vision that evaporates when you look */
const ghost = { g: null, t: 0 };
function updateGhost(dt) {
  if (S.sanity > .55 || S.chapter < 1) { if (ghost.g) ghost.g.visible = false; return; }
  if (!ghost.g) { ghost.g = makeWatcher(); ghost.g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .65; } }); scene.add(ghost.g); ghost.g.visible = false; }
  if (!ghost.g.visible) {
    ghost.t -= dt;
    if (ghost.t <= 0) {
      const a = player.yaw + pick([-1, 1]) * rnd(.9, 1.3), d = rnd(5, 10);
      const gx = player.x - Math.sin(a) * d, gz = player.z - Math.cos(a) * d;
      if (!losBlocked(player.x, player.z, gx, gz)) { ghost.g.position.set(gx, 0, gz); ghost.g.visible = true; ghost.seenT = 0; }
      ghost.t = rnd(5, 11);
    }
  } else {
    ghost.g.rotation.y = Math.atan2(player.x - ghost.g.position.x, player.z - ghost.g.position.z);
    if (canSee(ghost.g.position.x, 1.5, ghost.g.position.z, 20, .8)) { ghost.seenT += dt; if (ghost.seenT > .25) { ghost.g.visible = false; A.whisperBurst(.12); S.spike = Math.max(S.spike, .35); S.flash = Math.max(S.flash, .08); ghost.t = rnd(4, 9); } }
  }
}

/* ───────────────────────── shared props ───────────────────────── */
function makeBed(x, z, rot = 0) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot; world.add(g);
  const wood = mat({ map: texWood(true) });
  box(1.3, .45, 2.3, 0, .225, 0, wood, false, g);
  box(1.2, .2, 2.1, 0, .55, 0, mat({ color: 0xaaa6a0 }), false, g);
  box(.9, .12, .4, 0, .71, -.8, mat({ color: 0xcfcac2 }), false, g);
  box(1.22, .14, 1.35, 0, .68, .45, mat({ color: 0x5a1a1e }), false, g);
  box(1.4, 1.1, .1, 0, .75, -1.2, wood, false, g);
  return g;
}
function addInteract(obj, label, onUse, r = 2.4) { const it = { obj, label, onUse, r, on: true }; interactables.push(it); return it; }
const ELEVEN = 11;

/* ═════════════════════════ CHAPTER 0 — THE BEDROOM ═════════════════════════ */
const ch0 = {
  name: ['I', 'The Bedroom'],
  build() {
    scene.fog.color.set(0x05060c); scene.fog.density = .075; scene.background.set(0x05060c);
    amb.color.set(0x445080); amb.intensity = .95; moon.intensity = .6;
    const wp = texWall('#4b4a66', '#3c3b55'), wood = texWood(false), wm = mat({ map: wp });
    slab(6, 6, 0, 0, 0, wood); slab(6, 6, 0, 2.9, 0, texNoise('#2a2a3a', 12));
    const wmat = () => tmat(wp, 2.6, 1.2);
    wallBox(6.4, 2.8, .2, 0, 3.1, wmat()); wallBox(.2, 2.8, 6.4, 3.1, 0, wmat()); wallBox(.2, 2.8, 6.4, -3.1, 0, wmat());
    wallBox(2.4, 2.8, .2, -1.8, -3.1, wmat()); wallBox(2.4, 2.8, .2, 1.8, -3.1, wmat()); box(1.2, .5, .2, 0, 2.55, -3.1, wmat(), false);
    // window with a wrong moon
    const win = new T.Mesh(new T.PlaneGeometry(1.4, 1.7), new T.MeshBasicMaterial({ map: texMoonWindow() })); win.position.set(-2.99, 1.55, -.6); win.rotation.y = Math.PI / 2; world.add(win);
    box(.04, 1.7, .05, -2.97, 1.55, -.6, mat({ color: 0x1a1410 }), false); box(.04, .05, 1.4, -2.97, 1.55, -.6, mat({ color: 0x1a1410 }), false);
    pointLight(0x5a78d0, .9, 6, -2.4, 1.6, -.6);
    // furniture
    const bed = makeBed(2.15, 1.2, Math.PI); colliders.push({ x0: 1.4, x1: 2.9, z0: .0, z1: 2.4, on: true });
    const dwood = mat({ map: texWood(true) });
    box(.55, 1, 1.4, -2.65, .5, 1.9, dwood); box(.9, 1.9, .5, -2.55, .95, -2.75, dwood);
    box(.4, .3, .4, -1.1, .15, 2.7, mat({ color: 0x7a2630 }), false); box(.3, .3, .3, -.5, .15, 2.75, mat({ color: 0x2a5a7a }), false);
    const rug = cyl(1.3, 1.3, .02, -.2, .01, .3, mat({ color: 0x4a1218 }), 28);
    // mobile over the bed
    const mob = new T.Group(); mob.position.set(2.15, 2.35, 1.2); world.add(mob);
    box(.02, .5, .02, 0, .25, 0, mat({ color: 0x222 }), false, mob);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; box(.01, .35, .01, Math.cos(a) * .3, -.17, Math.sin(a) * .3, mat({ color: 0x333 }), false, mob); sph(.07, Math.cos(a) * .3, -.4, Math.sin(a) * .3, mat({ color: pick([0xddc080, 0xc0d0e0, 0xd08080, 0x90b090]) }), mob); }
    updaters.push(dt => { mob.rotation.y += dt * (.3 + S.sanity * 0); });
    // door to hallway
    this.door = makeDoor(-.6, -3.1, 1.2, 2.3, true, 0); this.doorCol = { x0: -.6, x1: .6, z0: -3.2, z1: -3.0, on: true }; colliders.push(this.doorCol);
    this.door.speed = .6;
    // music box
    const mb = new T.Group(); mb.position.set(-2.65, 1.0, 1.9); world.add(mb);
    box(.24, .12, .18, 0, .06, 0, mat({ color: 0x5a3a22 }), false, mb); box(.25, .03, .19, 0, .14, 0, mat({ color: 0xb59a5a, emissive: 0x2a2010 }), false, mb);
    const mbl = new T.PointLight(0xffcc88, .7, 3, 1.6); mbl.position.set(0, .3, 0); mb.add(mbl);
    this.musicBox = mb; this.wound = false; this.eyesT = 0; this.eyesSpot = 0;
    this.item = addInteract(mb, 'Wind the music box', () => this.wind(), 2.6);
    // watching eyes
    this.eyes = new T.Group(); [-1, 1].forEach(s => sph(.028, s * .06, 0, 0, new T.MeshBasicMaterial({ color: 0xffe9a0 }), this.eyes)); this.eyes.visible = false; world.add(this.eyes);
    this.spots = [[2.15, .22, .3, Math.PI / 2], [-2.9, 2.35, -2.6, -Math.PI / 4], [1.2, 1.0, -2.95, 0], [-2.5, .3, -2.0, Math.PI / 2]];
    this.placeEyes(0);
    lamp.color.set(0xffd9a0); lamp.intensity = 1.1; lamp.position.set(1.0, 1.9, .8); lamp.distance = 9; this.lampT = 1.1;
    player.x = 0.4; player.z = 0.2; player.yaw = Math.PI * .85; player.pitch = 0;
    later(1500, () => say("You don't remember falling asleep."));
    later(7000, () => say('A small song is stuck in your head. It lives in a box in this room.'));
  },
  placeEyes(i) { const s = this.spots[i % this.spots.length]; this.eyes.position.set(s[0], s[1], s[2]); this.eyes.rotation.y = s[3]; },
  wind() {
    if (this.wound) return; this.wound = true; this.item.on = false;
    A.startBox(.16); A.box.loops = 1; S.spike = .4; this.lampT = 0;
    say('It plays by itself. The room gets colder.', 5000);
    this.eyes.visible = true;
    later(8500, () => { say('Someone is humming along. Not in the room.', 5000); A.whisperBurst(.12); });
    later(14500, () => { this.doorCol.on = false; this.door.target = 1.5; A.creak(3, .08); say('The door is open. It was never locked, was it.', 5500); S.insanBase = .12; });
  },
  update(dt) {
    lamp.intensity = lerp(lamp.intensity, this.lampT * (1 + Math.sin(S.time * 23) * .04), dt * 2);
    animateDoor(this.door, dt);
    S.wind = this.wound ? .02 : 0; S.tension = this.wound ? .35 : .05;
    if (this.eyes.visible) {
      const p = this.eyes.position, seen = canSee(p.x, p.y, p.z, 8, .6);
      this.eyesT += seen ? dt : -dt * .2; if (this.eyesT < 0) this.eyesT = 0;
      if (this.eyesT > .5) { this.eyes.visible = false; A.whisperBurst(.1); S.spike = .3; later(rnd(2500, 5000), () => { if (S.chapter === 0) { this.eyesSpot++; this.placeEyes(this.eyesSpot); this.eyes.visible = true; this.eyesT = 0; } }); }
      else if (Math.random() < dt * .4) this.eyes.scale.y = .1; else this.eyes.scale.y = lerp(this.eyes.scale.y, 1, dt * 12);
    }
    if (player.z < -3.7 && this.door.angle > .5) goChapter(1);
  },
};

/* ═════════════════════════ CHAPTER 1 — THE HALLWAY THAT REPEATS ═════════════════════════ */
const ch1 = {
  name: ['II', 'The Hallway That Repeats'],
  build() {
    scene.fog.color.set(0x040405); scene.fog.density = .13; scene.background.set(0x040405);
    amb.color.set(0x3a3540); amb.intensity = .7; moon.intensity = 0;
    this.loop = 0; this.doors = []; this.paintings = []; this.lamps = []; this.blackout = 0; this.slamT = 8; this.wCooldown = 0; this.exitOpen = false;
    const wp = texWall('#3d4a3a', '#33402f'), wood = texWood(true);
    const Lz = -70, Zc = (4 + Lz) / 2, len = 4 - Lz;
    slab(2.6, len, 0, 0, Zc, wood, 2); slab(2.6, len, 0, 2.8, Zc, texNoise('#1c1c1c', 14));
    wallBox(.2, 2.8, len, -1.4, Zc, tmat(wp, len / 2.6, 1.1)); wallBox(.2, 2.8, len, 1.4, Zc, tmat(wp, len / 2.6, 1.1));
    wallBox(3, 2.8, .2, 0, 4.1, mat({ color: 0x20271f })); this.startWall = colliders[colliders.length - 1];
    this.endWall = wallBox(3, 2.8, .2, 0, Lz - .1, mat({ color: 0x20271f }));
    const black = new T.MeshBasicMaterial({ color: 0x000000 }), pts = [0, 1, 2].map(v => texPortrait(v, v + 3));
    this.pts = pts;
    for (let k = 0; k < 8; k++) {
      const z0 = 5 - k * 10;
      [[-1, z0], [1, z0 - 5]].forEach(([side, z]) => {
        const bp = new T.Mesh(new T.PlaneGeometry(.9, 2.1), black); bp.position.set(side * 1.29, 1.05, z); bp.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; world.add(bp);
        const pivot = new T.Group(); pivot.position.set(side * 1.27, 0, side < 0 ? z - .45 : z + .45); world.add(pivot);
        const off = side < 0 ? .45 : -.45;
        const leaf = new T.Mesh(new T.BoxGeometry(.07, 2.1, .9), mat({ map: texWood(true), color: 0x6a5545 })); leaf.position.set(0, 1.05, off); pivot.add(leaf);
        sph(.04, -side * .06, .95, off * 1.8, mat({ color: 0xb59a5a }), pivot);
        this.doors.push({ dr: { pivot, angle: 0, target: 0, speed: 3, base: 0, dir: 1 }, side, z });
      });
      [[-1, z0 - 5], [1, z0]].forEach(([side, z]) => {
        const fr = box(.06, 1.1, .8, side * 1.3, 1.65, z, mat({ color: 0x3a2a14 }), false);
        const pt = new T.Mesh(new T.PlaneGeometry(.66, .92), new T.MeshBasicMaterial({ map: pts[0], color: 0xbbbbbb })); pt.position.set(side * 1.265, 1.65, z); pt.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; world.add(pt); this.paintings.push(pt);
      });
      const lampM = new T.MeshBasicMaterial({ color: 0xffd9a0 }); box(.4, .06, .4, 0, 2.76, z0 - 2.5, lampM, false); this.lamps.push(lampM);
    }
    this.pl = new T.PointLight(0xffd9a0, 1.0, 11, 1.5); world.add(this.pl);
    this.exitLight = new T.PointLight(0xffffff, 0, 14, 1.2); this.exitLight.position.set(0, 1.6, 3.2); world.add(this.exitLight);
    this.exitDoor = makeDoor(-.6, 3.95, 1.2, 2.3, true, 0, 0xcfc7b8); this.exitDoor.mesh.material.emissive = new T.Color(0x555044); this.exitDoor.speed = 1;
    watcher.active = false; this.watcher = makeWatcher(); this.watcher.visible = false; world.add(this.watcher);
    player.x = 0; player.z = 0; player.yaw = 0; player.pitch = 0;
    this.applyLoop(0);
    this.wcol = null;
    later(2500, () => say('The hallway outside. You have never seen it before. You know every inch of it.'));
  },
  applyLoop(n) {
    const v = Math.min(n, 2);
    this.paintings.forEach((p, i) => { p.material.map = this.pts[v]; p.material.needsUpdate = true; });
    const warm = n < 2; this.lamps.forEach(m => m.color.set(warm ? 0xffd9a0 : 0xff3a2a)); this.pl.color.set(warm ? 0xffd9a0 : 0xff4030);
    S.insanBase = [.1, .2, .34, .5, .42][Math.min(n, 4)];
    this.doors.forEach((d, i) => { d.dr.target = (n >= 2 && d.side > 0) ? .4 : (n >= 3 && i % 3 === 0 ? .9 : 0); });
    this.watcher.visible = n === 3;
    if (n === 3) { this.watcher.position.set(0, 0, player.z - 17); this.wDist = 17; A.sting(.6); say('Something is standing at the end of the hall.'); }
    if (n === 1) say('The faces in the paintings are looking the other way now.', 4500);
    if (n === 2) { say('The lights have changed their mind.', 3500); A.whisperBurst(.15); }
    if (n === 4) {
      scene.fog.density = .065; this.watcher.visible = false;
      this.endWall.position.z = -44; colliders.push({ x0: -2, x1: 2, z0: -44.2, z1: -43.8, on: true });
      this.exitLight.intensity = 1.4; this.lamps.forEach(m => m.color.set(0xff6a50));
      say('Forward is not the way. Turn around.', 6000); A.sting(.4);
    }
  },
  update(dt) {
    const t = S.time;
    // moving lamp light and flicker
    this.pl.position.set(0, 2.3, player.z - 2.5);
    const bo = this.blackout > 0; this.blackout -= dt;
    this.pl.intensity = bo ? 0 : (.9 + Math.sin(t * 31) * .06) * (this.loop >= 2 ? .8 + Math.sin(t * 7) * .2 : 1);
    this.doors.forEach(d => animateDoor(d.dr, dt));
    S.wind = .03 + this.loop * .01; S.tension = .1 + this.loop * .1;
    // seamless loop: teleport when deep enough, no teleport on the final lap
    if (this.loop < 4) {
      if (player.z < -40) { player.z += 30; this.loop++; this.blackout = .25; this.applyLoop(this.loop); }
      if (player.z > 2.6) { player.z -= 30; this.blackout = .25; say('There is no going back yet.', 2500); }
    } else {
      if (player.z > 2.0 && this.exitDoor.target === 0) { this.exitDoor.target = 1.5; A.creak(2, .07); }
      animateDoor(this.exitDoor, dt);
      if (player.z > 3.3 && this.exitDoor.angle > .6) goChapter(2);
    }
    // doors that slam when you're not looking
    this.slamT -= dt;
    if (this.slamT <= 0 && this.loop >= 1) {
      this.slamT = rnd(6, 13);
      const near = this.doors.filter(d => Math.abs(d.z - player.z) < 14 && !canSee(d.side * 1.2, 1, d.z, 20, .3));
      if (near.length) { const d = pick(near); d.dr.target = d.dr.target > .1 ? 0 : 1.2; d.dr.speed = 9; setTimeout(() => d.dr.speed = 3, 600); d.dr.target ? A.creak(1.4, .07) : A.slam(); S.spike = Math.max(S.spike, .25); }
    }
    // the figure at the end of the hall creeps closer each blackout
    if (this.loop === 3 && this.watcher.visible) {
      const w = this.watcher; w.rotation.y = Math.PI * (w.position.z < player.z ? 0 : 1);
      w.rotation.y = Math.atan2(player.x - w.position.x, player.z - w.position.z);
      const d = Math.abs(w.position.z - player.z);
      if (Math.random() < dt * .22) { this.blackout = .22; w.position.z += 2.2; A.whisperBurst(.12); }
      if (d < 3.2) { this.blackout = .4; w.position.z = player.z + 9; A.sting(.8); S.flash = .35; S.spike = .6; }
      if (d > 3.2 && w.position.z < player.z) this.wDist = d;
    }
    S.sanity = clamp(S.sanity + dt * .03, 0, 1);
    S.sanity = Math.max(S.sanity, 1 - (S.insanBase + .35));
  },
};

/* ═════════════════════════ CHAPTER 2 — THE DROWNED HOUSE ═════════════════════════ */
const ch2 = {
  name: ['III', 'The Drowned House'],
  build() {
    scene.fog.color.set(0x061018); scene.fog.density = .034; scene.background.set(0x061018);
    amb.color.set(0x3a6080); amb.intensity = 1.0; moon.intensity = 1.0;
    this.items = []; this.got = 0; this.floaters = []; this.exitOpen = false;
    const wp = texWall('#5a5e58', '#4c504a'), wood = texWood(true), wmat = (w, h) => tmat(wp, w / 3, h / 3);
    const H = 6;
    // hall 24x24 (west/east walls have a doorway at z in [-1.5,1.5]; north wall at x in [-1.5,1.5])
    slab(24, 24, 0, 0, 0, texNoise('#1c2024', 16), 3); slab(24, 24, 0, H, 0, texNoise('#1a1c20', 14), 3);
    wallBox(24.4, H, .2, 0, 12.1, wmat(24, H));
    wallBox(10.75, H, .2, -6.625, -12.1, wmat(10, H)); wallBox(10.75, H, .2, 6.625, -12.1, wmat(10, H));
    for (const sx of [-1, 1]) { wallBox(.2, H, 10.75, sx * 12.1, -6.625, wmat(10, H)); wallBox(.2, H, 10.75, sx * 12.1, 6.625, wmat(10, H)); }
    // rooms (dry floors raised slightly)
    this.room(-16.5, 0, 'horse'); this.room(16.5, 0, 'ball'); this.room(0, -16.5, 'letter');
    // pillars, ruined stairs, floating furniture, inverted ceiling furniture
    [[-6, -6], [6, -6], [-6, 6], [6, 6], [0, 0]].forEach(([x, z]) => cyl(.6, .6, H, x, H / 2, z, mat({ color: 0x4a4e48 }), 12) && colliders.push({ x0: x - .6, x1: x + .6, z0: z - .6, z1: z + .6, on: true }));
    for (let i = 0; i < 10; i++) { const st = box(2.2, .3, .9, -9 + (i % 5) * 0, .15 + i * .3, 10 - i * .9, mat({ color: 0x3c3a36 }), false); st.position.x = -9; } colliders.push({ x0: -10.2, x1: -7.8, z0: 1.4, z1: 10.6, on: true });
    for (let i = 0; i < 14; i++) {
      const f = new T.Group(); const kind = i % 3; const m = mat({ map: wood });
      if (kind === 0) { box(.5, .06, .5, 0, .45, 0, m, false, f); [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]].forEach(([a, b]) => box(.05, .45, .05, a, .22, b, m, false, f)); box(.5, .6, .05, 0, .8, -.22, m, false, f); }
      else if (kind === 1) { box(1.1, .06, .7, 0, .7, 0, m, false, f); [[-.5, -.3], [.5, -.3], [-.5, .3], [.5, .3]].forEach(([a, b]) => box(.06, .7, .06, a, .35, b, m, false, f)); }
      else box(.6, .9, .4, 0, .5, 0, mat({ color: 0x5a3a2a }), false, f);
      f.position.set(rnd(-10, 10), rnd(.2, 1.1), rnd(-10, 10)); f.rotation.set(rnd(-.5, .5), rnd(0, 6), rnd(-.5, .5)); f.userData = { y: f.position.y, p: rnd(0, 6) }; world.add(f); this.floaters.push(f);
    }
    // upside-down living room on the ceiling
    const rugc = box(7, .05, 7, 0, H - .03, -2, mat({ color: 0x4a1a1a }), false);
    const tbl = new T.Group(); tbl.position.set(0, H - .75, -2); box(1.6, .08, 1, 0, 0, 0, mat({ map: wood }), false, tbl); [[-.7, -.4], [.7, -.4], [-.7, .4], [.7, .4]].forEach(([a, b]) => box(.07, .7, .07, a, .35, b, mat({ map: wood }), false, tbl)); world.add(tbl);
    sph(.5, 0, .7, 6, mat({ color: 0xffd8a0, emissive: 0x403010 }));
    // water
    const wm = new T.MeshLambertMaterial({ color: 0x0b2a3a, transparent: true, opacity: .8 }); this.water = new T.Mesh(new T.PlaneGeometry(70, 70), wm); this.water.rotation.x = -Math.PI / 2; this.water.position.y = .38; world.add(this.water);
    // dust motes
    const pg = new T.BufferGeometry(), pa = new Float32Array(300 * 3); for (let i = 0; i < 300; i++) { pa[i * 3] = rnd(-12, 12); pa[i * 3 + 1] = rnd(.5, 5.5); pa[i * 3 + 2] = rnd(-12, 12); } pg.setAttribute('position', new T.BufferAttribute(pa, 3));
    this.motes = new T.Points(pg, new T.PointsMaterial({ color: 0x8fb0c0, size: .04, transparent: true, opacity: .5 })); world.add(this.motes);
    // exit double door (south, locked)
    this.exitL = makeDoor(-1.4, 11.95, 1.4, 3.2, true, 0, 0x3a2a20); this.exitR = makeDoor(1.4, 11.95, 1.4, 3.2, false, 0, 0x3a2a20);
    this.exitCol = { x0: -1.4, x1: 1.4, z0: 11.8, z1: 12.0, on: true }; colliders.push(this.exitCol);
    this.exitLight = pointLight(0xfff2d0, 0, 12, 0, 2.2, 10.5);
    const gl = new T.Mesh(new T.PlaneGeometry(.1, 3.2), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); gl.position.set(0, 1.6, 11.9); gl.rotation.y = Math.PI; world.add(gl); this.glow = gl;
    this.exitItem = addInteract({ position: new T.Vector3(0, 1.2, 11.8) }, 'Open the door', () => this.tryExit(), 3.2);
    pointLight(0x6a98b8, 1.4, 30, 0, 4.5, 0); pointLight(0x6a98b8, 1.0, 22, 0, 4.5, -8);
    spawnWatcher(0, -9, .95);
    player.x = 0; player.z = 9.5; player.yaw = 0; player.pitch = 0;
    later(1500, () => say('Water to the ankles. Everything you ever lost is in this house.'));
    later(7500, () => say('Three things of yours are here. Bring them back to the door.'));
    this.start = { x: 0, z: 9.5 };
  },
  room(cx, cz, kind) {
    const wp = texWall('#4a4038', '#3e352e'), w = tmat(wp, 2.4, 1.2);
    const horiz = Math.abs(cx) > 1; const H = 6;
    const sg = Math.sign(cx || -1);
    if (horiz) {
      slab(9, 8, cx, 0, cz, texWood(true)); slab(9, 8, cx, 3.2, cz, texNoise('#1c1c1c', 12));
      wallBox(.2, 3.2, 8.4, cx + sg * 4.6, cz, w); wallBox(9, 3.2, .2, cx, cz - 4.1, w); wallBox(9, 3.2, .2, cx, cz + 4.1, w);
    } else {
      slab(8, 9, cx, 0, cz, texWood(true)); slab(8, 9, cx, 3.2, cz, texNoise('#1c1c1c', 12));
      wallBox(8.4, 3.2, .2, cx, cz - 4.6, w); wallBox(.2, 3.2, 9, cx - 4.1, cz, w); wallBox(.2, 3.2, 9, cx + 4.1, cz, w);
    }
    // hall wall segments above door lintel
    const glow = new T.PointLight(0xffcc88, 1.1, 8, 1.4);
    let it;
    const base = { x: cx + (horiz ? sg * 2.4 : 0), z: cz + (horiz ? 0 : -2.4) };
    if (kind === 'horse') { it = new T.Group(); box(.5, .12, .22, 0, .3, 0, mat({ color: 0xb48a50, emissive: 0x2a1c0c }), false, it); box(.12, .35, .12, .2, .55, 0, mat({ color: 0xb48a50, emissive: 0x2a1c0c }), false, it); [[-.18, .08], [.18, .08], [-.18, -.08], [.18, -.08]].forEach(([a, b]) => box(.04, .25, .04, a, .12, b, mat({ color: 0x8a6030 }), false, it)); }
    else if (kind === 'ball') { it = new T.Group(); sph(.18, 0, .3, 0, mat({ color: 0xb01c1c, emissive: 0x300808 }), it); }
    else { it = new T.Group(); box(.3, .02, .22, 0, .3, 0, mat({ color: 0xe8dfc8, emissive: 0x403c30 }), false, it); }
    it.position.set(base.x, .45, base.z); it.add(glow); glow.position.set(0, .5, 0); world.add(it);
    const labels = { horse: 'Take the wooden horse', ball: 'Take the red ball', letter: 'Take the letter' };
    const lines = { horse: 'You rode this to the end of every summer.', ball: 'You lost this on the day the water came in.', letter: 'It is addressed to you. It is in your own handwriting.' };
    const rec = { kind, obj: it };
    rec.it = addInteract(it, labels[kind], () => { world.remove(it); rec.it.on = false; this.got++; watcher.speed += .3; S.spike = .5; S.sanity = Math.max(S.sanity - .1, .1); A.sting(.5); say(lines[kind], 5000); if (this.got >= 3) { this.unlock(); } else later(4600, () => say(`${this.got} of 3. The house breathes in.`, 3500)); }, 2.4);
    this.items.push(rec);
    // furniture in rooms for atmosphere
    box(1.4, .8, .7, cx + (horiz ? -sg * 1 : 2.5), .4, cz + (horiz ? 3 : 0), mat({ map: texWood(true) }));
  },
  unlock() {
    this.exitOpen = true; this.exitLight.intensity = 1.6; this.glow.material.opacity = .7; A.startBox(.12); A.box.loops = 2; say('The front door is unlocked. It is bright out there. That is the problem.', 6500);
  },
  tryExit() {
    if (!this.exitOpen) { say('It will not open. Not yet.', 2500); A.creak(.7, .04); return; }
    this.exitCol.on = false; this.exitL.target = 1.7; this.exitR.target = 1.7; A.creak(3, .07); S.fadeTarget = 0; later(1800, () => goChapter(3));
  },
  caught() {
    if (S.fadeTarget === 0) return; S.fadeTarget = 0; S.flash = 1; A.sting(1.2); say('Again.', 3000);
    setTimeout(() => { player.x = this.start.x; player.z = this.start.z; player.yaw = 0; watcher.g.position.set(rnd(-4, 4), 0, -9); S.sanity = Math.max(S.sanity, .6); S.fadeTarget = 1; S.flash = 0; }, 1600);
  },
  update(dt) {
    S.wading = Math.abs(player.x) < 24 && Math.abs(player.z) < 24;
    this.floaters.forEach(f => { f.position.y = f.userData.y + Math.sin(S.time * .6 + f.userData.p) * .08; f.rotation.y += dt * .05; });
    this.water.position.y = .38 + Math.sin(S.time * .8) * .015;
    this.motes.rotation.y += dt * .01;
    animateDoor(this.exitL, dt); animateDoor(this.exitR, dt);
    S.wind = .04;
    if (S.fadeTarget !== 0 || S.fade > .3) updateWatcher(dt, () => this.caught());
    if (S.sanity <= 0) { S.sanity = .5; this.caught(); }
    S.sanity = clamp(S.sanity, 0, 1);
    if (!watcher.seen && S.eye < .5) S.sanity = clamp(S.sanity + dt * (S.flashlightOn ? .02 : -.01), 0, 1);
    if (S.eye > .5) S.sanity = clamp(S.sanity + dt * .1, 0, 1);
    S.insanBase = this.got * .06;
    this.items.forEach(i => { if (i.it.on) { i.obj.rotation.y += dt; i.obj.position.y = .55 + Math.sin(S.time * 2) * .05; } });
  },
};

/* ═════════════════════════ CHAPTER 3 — THE LONG WAY DOWN TO YOU ═════════════════════════ */
const ch3 = {
  name: ['IV', 'The Sleeper'],
  build() {
    scene.fog.color.set(0x0a0612); scene.fog.density = .035; scene.background.set(0x0a0612);
    amb.color.set(0x6a58a0); amb.intensity = 1.0; moon.intensity = .6;
    const Lz = -72;
    slab(3.6, 78, 0, 0, -31, texChecker(), 1.8);
    [-1, 1].forEach(s => { box(.08, .06, 78, s * 1.84, .03, -31, new T.MeshBasicMaterial({ color: 0x7a3a8a }), false); colliders.push({ x0: s > 0 ? 1.85 : -2.5, x1: s > 0 ? 2.5 : -1.85, z0: -66, z1: 8, on: true, noLos: true }); });
    colliders.push({ x0: -2, x1: 2, z0: 8, z1: 9, on: true, noLos: true });
    // end platform
    slab(11, 11, 0, 0, -71, texChecker(), 1.8);
    colliders.push({ x0: -6.5, x1: -5.5, z0: -77, z1: -65, on: true, noLos: true }, { x0: 5.5, x1: 6.5, z0: -77, z1: -65, on: true, noLos: true }, { x0: -6, x1: 6, z0: -77.5, z1: -76.5, on: true, noLos: true });
    colliders.push({ x0: -6.5, x1: -2.2, z0: -66, z1: -65, on: true, noLos: true }, { x0: 2.2, x1: 6.5, z0: -66, z1: -65, on: true, noLos: true });
    // stars
    const sg = new T.BufferGeometry(), sa = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { const r = rnd(50, 130), a = rnd(0, 6.28), b = Math.acos(rnd(-1, 1)); sa[i * 3] = r * Math.sin(b) * Math.cos(a); sa[i * 3 + 1] = r * Math.cos(b) * .8; sa[i * 3 + 2] = r * Math.sin(b) * Math.sin(a) - 40; }
    sg.setAttribute('position', new T.BufferAttribute(sa, 3)); world.add(new T.Points(sg, new T.PointsMaterial({ color: 0xcfc0ff, size: .35, fog: false })));
    // floating wreckage of the previous rooms
    this.drift = [];
    for (let i = 0; i < 46; i++) {
      const s = rnd(.25, 1.1), m = mat({ color: pick([0x5a3a2a, 0x3a3a52, 0x4a1a1e, 0x2e4a3a, 0xb0a890]) });
      const o = box(s, s * rnd(.4, 2), s * rnd(.5, 1.5), pick([-1, 1]) * rnd(7, 30), rnd(-8, 14), rnd(-85, 15), m, false); o.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); o.userData = { r: new T.Vector3(rnd(-.2, .2), rnd(-.2, .2), rnd(-.2, .2)) }; this.drift.push(o);
    }
    for (let i = 0; i < 10; i++) { const d = new T.Group(); box(1, 2, .1, 0, 1, 0, mat({ color: 0x1a1218 }), false, d); box(.8, 1.8, .02, 0, .95, .06, new T.MeshBasicMaterial({ color: i % 3 ? 0x000000 : 0xfff0c0 }), false, d); d.position.set(pick([-1, 1]) * rnd(9, 22), rnd(-2, 8), rnd(-75, 0)); d.rotation.y = rnd(0, 6); d.userData = { r: new T.Vector3(0, rnd(-.1, .1), 0) }; world.add(d); this.drift.push(d); }
    // the choir of watchers
    this.choir = [];
    for (let i = 0; i < 14; i++) { const w = makeWatcher(1 + rnd(-.05, .2)); const s = i % 2 ? 1 : -1; w.position.set(s * rnd(4.5, 7), -.0, -4 - i * 4.4); w.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; w.userData.side = s; world.add(w); this.choir.push(w); }
    // the bed
    makeBed(0, -73.2, 0); colliders.push({ x0: -.75, x1: .75, z0: -74.4, z1: -72.0, on: true });
    this.sleeper = new T.Group(); this.sleeper.position.set(0, .8, -73.1); world.add(this.sleeper);
    box(.5, .22, 1.5, 0, 0, .2, mat({ color: 0x7a707a }), false, this.sleeper); sph(.17, 0, .08, -.7, mat({ color: 0xc8b8a8 }), this.sleeper);
    pointLight(0xffc890, 1.6, 9, 0, 2.4, -71); [-10,-28,-46,-62].forEach(z => pointLight(0x9a7aff, 1.3, 26, 0, 3.5, z)); scene.fog.density = .022;
    this.bedObj = { position: new T.Vector3(0, 1, -71.5) };
    this.itemBed = addInteract(this.bedObj, 'Lie down', () => this.ending(), 3.4);
    watcher.active = false; spawnWatcher(0, 6, 1.6); watcher.g.position.set(0, 0, 4);
    player.x = 0; player.z = 1; player.yaw = 0; player.pitch = 0;
    this.ended = false;
    later(1500, () => say('There is a bed at the end of this. Someone is already in it.'));
    later(8000, () => say('Do not run. Running is what it wants you to do.', 4500));
  },
  ending() {
    if (this.ended) return; this.ended = true; S.input = false; watcher.active = false; torch.intensity = 0;
    A.startBox(.2); A.box.loops = 3; S.spike = 1;
    const lines = ['You lie down beside yourself.', 'You were never the one who was dreaming.', 'The song stops. The house is very quiet.', 'You open your eyes.', 'Something is standing at the foot of the bed.'];
    lines.forEach((l, i) => setTimeout(() => say(l, 3400), i * 4200));
    setTimeout(() => { S.flash = 1; A.sting(1.4); S.fadeTarget = 0; }, 4200 * 5 - 600);
    setTimeout(() => showEnd(), 4200 * 5 + 2500);
  },
  caught() {
    if (S.fadeTarget === 0) return; S.fadeTarget = 0; S.flash = 1; A.sting(1.2); say('Not yet.', 3000);
    setTimeout(() => { player.x = 0; player.z = Math.min(player.z + 12, 1); watcher.g.position.set(0, 0, player.z + 10); S.sanity = Math.max(S.sanity, .6); S.fadeTarget = 1; S.flash = 0; }, 1600);
  },
  update(dt) {
    this.drift.forEach(o => { o.rotation.x += o.userData.r.x * dt; o.rotation.y += o.userData.r.y * dt; o.rotation.z += o.userData.r.z * dt; });
    S.wind = .05;
    this.choir.forEach(w => {
      const seen = canSee(w.position.x, 1.6, w.position.z, 45, .45) || canSee(w.position.x, 2.5, w.position.z, 45, .45);
      if (!seen) {
        w.rotation.y = Math.atan2(player.x - w.position.x, player.z - w.position.z);
        const target = w.userData.side * 2.5; if (Math.abs(w.position.x) > 2.5) w.position.x -= w.userData.side * dt * .3;
        w.userData.head.rotation.z = .18 + Math.sin(S.time * 6 + w.position.z) * .1;
      } else { S.sanity -= dt * .008; }
    });
    if (!this.ended) updateWatcher(dt, () => this.caught());
    if (S.sanity <= 0) { S.sanity = .5; this.caught(); }
    S.sanity = clamp(S.sanity + (S.eye > .5 ? .1 : (watcher.seen ? 0 : .01)) * dt, 0, 1);
    S.insanBase = clamp((-player.z) / 90, 0, .7);
    S.tension = Math.max(S.tension, clamp(-player.z / 80, 0, .8));
  },
};
const chapters = [ch0, ch1, ch2, ch3];

function goChapter(i) {
  S.chapter = i; currentCh = chapters[i];
  clearWorld(); watcher.g = null; watcher.active = false; ghost.g && (ghost.g.visible = false);
  S.scrape = 0; S.wading = false; S.spike = 0; S.input = true; S.fadeTarget = 1; S.sanity = Math.max(S.sanity, .7); S.flash = 0;
  A.stopBox(); torch.intensity = 1.7; lamp.intensity = 0; lamp.distance = 12;
  currentCh.build(); card(`Chapter ${currentCh.name[0]}`, currentCh.name[1]);
  const t = (s => s); if (location.hash !== '#ch=' + i) try { history.replaceState(null, '', '#ch=' + i); } catch (e) { /* ignore */ }
}

/* ───────────────────────── input ───────────────────────── */
window.addEventListener('keydown', e => {
  if (e.repeat) return; keys[e.code] = true;
  if (e.code === 'KeyF' && S.running) { S.flashlightOn = !S.flashlightOn; A.burst(2000, 5, .04, .1); }
  if (e.code === 'KeyE' && S.running && S.input) useInteract();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
let locked = false;
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && S.running && !S.endShown) { S.paused = true; $('pause').classList.remove('hidden'); }
});
document.addEventListener('mousemove', e => {
  if (!S.running || S.paused || !S.input) return;
  if (locked || e.buttons & 1) { player.yaw -= e.movementX * .0022; player.pitch = clamp(player.pitch - e.movementY * .0022, -1.35, 1.35); }
});
function lockPointer() { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
function startGame() {
  A.init(); $('menu').classList.add('hidden'); $('pause').classList.add('hidden'); $('end').classList.add('hidden'); S.endShown = false;
  if (!S.running) { S.running = true; S.sanity = 1; goChapter(0); } S.paused = false; lockPointer();
}
$('menu').addEventListener('click', startGame);
$('pause').addEventListener('click', () => { A.init(); $('pause').classList.add('hidden'); S.paused = false; lockPointer(); });
$('end').addEventListener('click', () => { S.running = false; S.sanity = 1; S.endShown = false; startGame(); });
function showEnd() { S.endShown = true; $('endtxt').textContent = 'The dream remembers you. It will be here when you close your eyes.'; $('end').classList.remove('hidden'); try { document.exitPointerLock(); } catch (e) { /* ignore */ } }

function useInteract() {
  const it = target; if (it) it.onUse();
}
let target = null;
function findTarget() {
  const f = fwdVec(); let best = null, bd = .9;
  for (const it of interactables) {
    if (!it.on) continue;
    const o = it.obj.getWorldPosition ? it.obj.getWorldPosition(new T.Vector3()) : it.obj.position;
    const dx = o.x - player.x, dy = o.y - camera.position.y, dz = o.z - player.z, d = Math.hypot(dx, dy, dz);
    if (d > it.r) continue; const dot = (dx * f.x + dy * f.y + dz * f.z) / d;
    if (dot > bd) { bd = dot; best = it; }
  }
  return best;
}

/* ───────────────────────── main loop ───────────────────────── */
function movePlayer(dt) {
  let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  player.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * 1.9 * dt;
  if (!S.input) { f = s = 0; }
  const len = Math.hypot(f, s) || 1; f /= len; s /= len;
  let sp = (keys.ShiftLeft || keys.ShiftRight ? 4.3 : 2.5) * (S.wading ? .72 : 1) * (S.eye > .5 ? .3 : 1);
  const tx = (-Math.sin(player.yaw) * f + Math.cos(player.yaw) * s) * sp, tz = (-Math.cos(player.yaw) * f - Math.sin(player.yaw) * s) * sp;
  player.vx = lerp(player.vx, tx, clamp(dt * 12, 0, 1)); player.vz = lerp(player.vz, tz, clamp(dt * 12, 0, 1));
  player.x += player.vx * dt; player.z += player.vz * dt; resolve(player, player.r);
  const v = Math.hypot(player.vx, player.vz);
  player.bob += v * dt * 2.3; const ph = Math.sin(player.bob);
  if (v > .5 && ph < 0 && player.lastStep >= 0) A.step(S.chapter === 2 ? 'water' : S.chapter === 3 ? 'tile' : 'wood');
  player.lastStep = ph;
  camera.position.set(player.x, 1.62 + ph * .035 * Math.min(1, v / 2.5) - S.eye * .15, player.z);
}
function update(dt) {
  S.time += dt;
  S.spike = Math.max(0, S.spike - dt * .5); S.flash = Math.max(0, S.flash - dt * 1.6); S.tension = Math.max(0, S.tension - dt * .5);
  const eyeT = keys.KeyQ && S.input ? 1 : 0; S.eye = lerp(S.eye, eyeT, clamp(dt * 9, 0, 1));
  S.fade = lerp(S.fade, S.fadeTarget, clamp(dt * (S.fadeTarget ? 1.5 : 4), 0, 1));
  if (S.running) movePlayer(dt); else { player.yaw = Math.PI * .85 + Math.sin(S.time * .15) * .15; camera.position.set(player.x, 1.62, player.z); }
  if (currentCh) currentCh.update(dt);
  updaters.forEach(u => u(dt));
  updateGhost(dt);
  const insan = clamp((1 - S.sanity) * .75 + S.insanBase + S.spike, 0, 1);
  S.insan = insan;
  // camera feel
  camera.rotation.set(player.pitch, player.yaw, Math.sin(S.time * .7) * insan * .035);
  camera.fov = 72 + Math.sin(S.time * .5) * insan * 6 + S.spike * 6; camera.updateProjectionMatrix();
  torch.intensity = S.flashlightOn ? 1.7 * (insan > .4 && Math.random() < insan * .08 ? .1 : 1) : 0;
  torch.angle = .5 - insan * .12;
  target = S.running && S.input ? findTarget() : null;
  const pr = $('prompt'); if (target) { pr.textContent = 'E — ' + target.label; pr.classList.add('on'); } else pr.classList.remove('on');
  const san = $('san').firstElementChild; san.style.width = (S.sanity * 100).toFixed(0) + '%'; san.style.background = S.sanity > .5 ? '#b9b3a4' : S.sanity > .25 ? '#b08a4a' : '#8a1c1c';
  post.mat.uniforms.time.value = S.time; post.mat.uniforms.insan.value = insan; post.mat.uniforms.flash.value = S.flash; post.mat.uniforms.eye.value = S.eye; post.mat.uniforms.fade.value = S.fade;
  if (S.running) A.update(dt, { insan, scrape: S.scrape * (S.running ? 1 : 0), wind: S.wind, tension: clamp(S.tension + S.spike * .5, 0, 1) });
  // the Watcher's scratching only matters while the screen is not black
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!S.paused) update(dt);
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(post.scene, post.cam);
  requestAnimationFrame(frame);
}
resize();
// idle title backdrop: build the bedroom so the menu has something behind it
S.chapter = 0; currentCh = ch0; ch0.build(); S.fade = 1; S.chapter = -1; $('card').classList.remove('on');
requestAnimationFrame(frame);

// debug / test hooks
window.__dream = { S, player, goChapter, startGame, watcher, camera, chapters, say, colliders };
const m = /ch=(\d)/.exec(location.hash); if (m && /debug/.test(location.search)) { S.running = true; goChapter(+m[1]); $('menu').classList.add('hidden'); }
})();
