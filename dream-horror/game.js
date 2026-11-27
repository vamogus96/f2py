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
    uniforms: { t: { value: rt.texture }, time: { value: 0 }, insan: { value: 0 }, flash: { value: 0 }, eye: { value: 0 }, fade: { value: 1 }, hue: { value: 0 }, invert: { value: 0 }, ghost: { value: 0 }, listen: { value: 0 }, tint: { value: new T.Vector3(1, 1, 1) } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `
      uniform sampler2D t; uniform float time,insan,flash,eye,fade,hue,invert,ghost,listen; uniform vec3 tint; varying vec2 vUv;
      vec3 hueRot(vec3 c,float a){ mat3 toY=mat3(.299,.596,.211,.587,-.274,-.523,.114,-.322,.312); mat3 toR=mat3(1.,1.,1.,.956,-.272,-1.106,.621,-.647,1.703); vec3 y=toY*c; float an=atan(y.z,y.y+1e-5)+a, ch=length(y.yz); y.y=ch*cos(an); y.z=ch*sin(an); return toR*y; }
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){
        vec2 c=vUv-.5; float d=length(c);
        vec2 uv=vUv + insan*.010*vec2(sin(vUv.y*18.+time*1.7),cos(vUv.x*14.+time*1.3));
        uv=.5+(uv-.5)*(1.-insan*.10*d*d*4.);
        uv+=listen*.006*sin(d*70.-time*7.)*(c/(d+.001));
        float ab=.0015+insan*.010+flash*.02;
        vec3 col; col.r=texture2D(t,uv+c*ab).r; col.g=texture2D(t,uv).g; col.b=texture2D(t,uv-c*ab).b;
        col=mix(col,texture2D(t,uv+vec2(.014,.005)).rgb,ghost*.38);
        col=hueRot(col,hue)*tint;
        float g=dot(col,vec3(.3,.59,.11)); col=mix(col,vec3(g)*vec3(1.,.95,.9),insan*.55);
        col=mix(col,vec3(g)*vec3(.75,.95,1.15),listen*.55);
        col=mix(col,vec3(1.)-col,invert);
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
    this.tin = c.createGain(); this.tin.gain.value = 0; this.tin.connect(comp); this.tinOsc = [];
    [6150, 6168].forEach(f => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(this.tin); o.start(); this.tinOsc.push(o); });
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
  chime() { [1537.5, 2306, 3075].forEach((f, i) => this.tone(f, 2.4 - i * .4, .07 - i * .015, 'sine', i * .06)); },
  startBox(vol = .15) { this.box = { i: 0, t: 0, vol, on: true }; },
  stopBox() { if (this.box) this.box.on = false; },
  update(dt, st) {
    if (!this.ready) return;
    const t = this.now();
    this.drone.gain.setTargetAtTime(.10 + st.insan * .22, t, .3);
    this.sc.g.gain.setTargetAtTime(st.scrape, t, .05);
    this.sc.f.frequency.setTargetAtTime(500 + st.insan * 500, t, .2);
    this.wind.g.gain.setTargetAtTime(st.wind, t, .5);
    // tinnitus: always there, louder with fear, deafening when you listen to it
    const tg = Math.min(.035, (.0022 + st.insan * .006 + st.listen * .018 + st.ring) * (session.mods.storm ? 2.4 : 1));
    this.tin.gain.setTargetAtTime(tg, t, .15);
    const f0 = 6150 + st.insan * 700 - st.listen * 400; this.tinOsc[0].frequency.setTargetAtTime(f0, t, .3); this.tinOsc[1].frequency.setTargetAtTime(f0 + 18 + st.insan * 30, t, .3);
    this.out.gain.setTargetAtTime(.9 * (1 - st.listen * .65), t, .1);
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

/* ───────────────────────── dream sessions: every run dreams a different strangeness ───────────────────────── */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const MODS = [
  ['tilt', 'Tilted Horizon'], ['child', 'Child Height'], ['breath', 'Breathing Walls'], ['red', 'Red Tide'], ['hue', 'Hue Drift'], ['neg', 'Negative Moon'],
  ['double', 'Double Vision'], ['long', 'Long Corridors'], ['heavy', 'Heavy Air'], ['echo', 'Echoing Steps'], ['storm', 'Tinnitus Storm'], ['pulse', 'Breathing Light'],
];
const session = { mods: {} };
function newSession(seed) {
  if (seed == null || isNaN(seed)) seed = 10000 + ((Math.random() * 89999) | 0);
  const r = mulberry(seed), level = 1 + Math.floor(r() * 5), pool = MODS.slice(), mods = {}, names = [];
  for (let i = 0; i < level; i++) { const m = pool.splice(Math.floor(r() * pool.length), 1)[0]; mods[m[0]] = true; names.push(m[1]); }
  Object.assign(session, { seed, level, mods, names, roll: (r() < .5 ? -1 : 1) * (.06 + r() * .09), negT: 12 });
  const el = document.getElementById('session');
  if (el) el.innerHTML = `Dream session <b>#${seed}</b> &nbsp;·&nbsp; strangeness ${'●'.repeat(level)}${'○'.repeat(5 - level)}<br><span>${names.join(' · ')}</span>`;
}
newSession(+((/seed=(\d+)/.exec(location.search) || [])[1]));

/* ───────────────────────── state ───────────────────────── */
const keys = {};
const S = {
  running: false, paused: false, time: 0, chapter: -1, sanity: 1, insanBase: 0, spike: 0, flash: 0, fade: 1, fadeTarget: 1,
  eye: 0, listen: 0, ring: 0, seated: false, uiMode: false, heard: new Set(), moleHelped: false, citations: 0, flashlightOn: true, scrape: 0, wind: 0, tension: 0, input: true, fovKick: 0, shake: 0, wading: false,
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
  colliders.length = 0; interactables.length = 0; updaters.length = 0; echoes.length = 0;
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
  if (S.sanity > .55 || S.chapter < 1 || S.chapter >= 4) { if (ghost.g) ghost.g.visible = false; return; }
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
/* Empathy echoes: people you failed, audible only at the frequency of your tinnitus. Hold R to listen. */
const echoes = [], ECHO_TOTAL = 10;
function addEcho(id, x, z, line) {
  if (S.heard.has(id)) return;
  const g = new T.Group(), m = new T.MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false });
  cyl(.16, .25, 1.25, 0, .72, 0, m, 8, g); sph(.15, 0, 1.55, 0, m, g);
  [-1, 1].forEach(s => { const a = cyl(.05, .04, .75, s * .26, 1.0, 0, m, 5, g); a.rotation.z = s * .16; });
  g.position.set(x, 0, z); world.add(g);
  const e = { id, g, m, line, dying: false };
  e.it = addInteract({ position: new T.Vector3(x, 1.2, z) }, 'Listen to the echo', () => hearEcho(e), 2.9);
  e.it.cond = () => S.listen > .5; echoes.push(e);
}
function hearEcho(e) {
  e.dying = true; e.it.on = false; S.heard.add(e.id); A.chime(); S.ring = .02;
  S.sanity = Math.min(1, S.sanity + .25); say(e.line, 8000);
}
function updateEchoes(dt) {
  for (let i = echoes.length - 1; i >= 0; i--) {
    const e = echoes[i], tgt = e.dying ? 0 : S.listen * (.38 + .14 * Math.sin(S.time * 3 + e.g.position.x));
    e.m.opacity = lerp(e.m.opacity, tgt, clamp(dt * (e.dying ? 1.5 : 6), 0, 1));
    e.g.position.y = Math.sin(S.time * 1.3 + i) * .05 + (e.dying ? (1 - e.m.opacity) * 0 : 0);
    e.g.rotation.y = Math.atan2(player.x - e.g.position.x, player.z - e.g.position.z);
    if (e.dying && e.m.opacity < .01) { world.remove(e.g); echoes.splice(i, 1); }
  }
}

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
    addEcho('e0', -1.6, 2.0, 'A child, ringing at your frequency: "Papa says the air costs more when you cry."');
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
    addEcho('e1', .7, -24, 'Teo Barsk: "One, two, three floors. Breathe on four. The meter cannot hear you on four."');
    addEcho('e2', -.7, -33, 'Ines Calder: "The renewal office is closed. It is always closed. I hold my breath in the lift."');
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
      if (player.z > 3.3 && this.exitDoor.angle > .6) goChapter(5);
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
    addEcho('e3', -8, -8, 'Lene Okafor: "I paid this morning. The price was different this morning."');
    addEcho('e4', 8, 8, 'Mara Ilves: "It said VOLUNTEER. I thought it meant the hospital."');
    addEcho('e5', -16.5, 3, 'Josef Dunmore: "Fifty years I breathed this city. I only wanted to see my garden again."');
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
    addEcho('e6', 0, -30, 'Ruta Vey, the one they call M: "They are not growing food from volunteers. They are growing volunteers into food."');
    addEcho('e7', 1, -56, 'Your own voice, from the booth: "Next. Papers, please. Next."');
    this.ended = false;
    later(1500, () => say('There is a bed at the end of this. Someone is already in it.'));
    later(8000, () => say('Do not run. Running is what it wants you to do.', 4500));
  },
  ending() {
    if (this.ended) return; this.ended = true; S.input = false; watcher.active = false; torch.intensity = 0;
    A.startBox(.2); A.box.loops = 3; S.spike = 1;
    const lines = ['You lie down beside yourself.', 'You were never the one who was dreaming.',
      S.moleHelped ? 'Somewhere a woman called M is still breathing because of you. The ringing is softer.' : 'Everyone you sent away is ringing at once.',
      'The song stops. The house is very quiet.', 'You open your eyes.', 'Something is standing at the foot of the bed. It is holding a Greening Loan with your name on it.'];
    lines.forEach((l, i) => setTimeout(() => say(l, 3400), i * 4200));
    setTimeout(() => { S.flash = 1; A.sting(1.4); S.fadeTarget = 0; }, 4200 * lines.length - 600);
    setTimeout(() => showEnd(), 4200 * lines.length + 2500);
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

/* ═════════════════════════ THE VERDANT — plant-man monster (demo) ═════════════════════════ */
function texBark() {
  return mkCanvas(128, 128, (g, w, h) => {
    g.fillStyle = '#4a5a34'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 4) { g.fillStyle = `hsl(${rnd(70, 110)},${rnd(25, 45)}%,${rnd(14, 32)}%)`; g.fillRect(x, 0, rnd(2, 5), h); }
    g.strokeStyle = '#1a1d0c'; g.globalAlpha = .5; for (let i = 0; i < 24; i++) { g.beginPath(); const x = rnd(0, w); g.moveTo(x, rnd(0, h)); g.lineTo(x + rnd(-6, 6), rnd(0, h)); g.stroke(); }
    g.globalAlpha = 1; noise(g, w, h, 28);
  });
}
function makePlantMan() {
  const g = new T.Group(), bark = mat({ map: texBark(), color: 0x9aa47c, emissive: 0x0a1405 }), leaf = mat({ color: 0x2f8a3a, emissive: 0x0f4a1a, side: T.DoubleSide });
  const glowM = new T.MeshBasicMaterial({ color: 0xb4ff5a }), skin = mat({ color: 0x8a9a6a, emissive: 0x141c0a });
  // root-legs
  [-1, 1].forEach(s => {
    const th = cyl(.1, .15, .9, s * .18, .75, 0, bark, 7, g); th.rotation.z = s * .08;
    const sh = cyl(.06, .1, .8, s * .2, .32, .05, bark, 7, g);
    for (let i = 0; i < 5; i++) { const r = cyl(.0, .05, .5, s * .2 + Math.cos(i * 1.3) * .15, .05, Math.sin(i * 1.3) * .2, bark, 5, g); r.rotation.set(Math.sin(i * 1.3) * 1.2, 0, -Math.cos(i * 1.3) * 1.2); }
  });
  // hunched torso with glowing ribs and a pulsing seed pod
  const torso = new T.Group(); torso.position.set(0, 1.45, 0); torso.rotation.x = .22; g.add(torso);
  cyl(.27, .21, 1.15, 0, 0, 0, bark, 9, torso);
  for (let i = 0; i < 4; i++) { const rib = new T.Mesh(new T.TorusGeometry(.26 - i * .015, .018, 5, 14, Math.PI), glowM); rib.position.set(0, .35 - i * .2, .02); rib.rotation.set(0, 0, Math.PI); rib.rotation.x = Math.PI / 2 * 0; torso.add(rib); rib.rotation.y = Math.PI / 2; rib.rotation.set(Math.PI / 2, 0, 0); rib.scale.set(1, 1, 1); rib.position.y = .35 - i * .2; rib.rotation.z = 0; }
  const pod = sph(.13, 0, .1, .22, glowM, torso);
  // arms: long, thorned, knuckles near the knees
  const arms = [];
  [-1, 1].forEach(s => {
    const a = new T.Group(); a.position.set(s * .33, .5, 0); torso.add(a);
    cyl(.07, .05, .85, 0, -.42, 0, bark, 6, a); const fo = new T.Group(); fo.position.set(0, -.85, 0); a.add(fo);
    cyl(.05, .035, .9, 0, -.45, 0, bark, 6, fo);
    for (let i = 0; i < 4; i++) { const c = cyl(0, .02, .3, (i - 1.5) * .035, -1.0, 0, glowM, 4, fo); c.rotation.x = .1; }
    for (let i = 0; i < 6; i++) { const t = cyl(0, .02, .12, 0, -.2 - i * .12, 0, bark, 4, fo); t.position.x = (i % 2 ? .04 : -.04); t.rotation.z = (i % 2 ? -1 : 1) * 1.3; }
    arms.push(a);
  });
  // head: pale human-ish face inside an opening flower collar
  const head = new T.Group(); head.position.set(0, 1.0, .12); torso.add(head);
  cyl(.07, .09, .25, 0, -.12, 0, bark, 6, head);
  const sk = sph(.15, 0, .08, 0, skin, head); sk.scale.set(.9, 1.25, .95);
  [-1, 1].forEach(s => sph(.022, s * .055, .1, .13, glowM, head));
  const mo = new T.Mesh(new T.PlaneGeometry(.07, .015), new T.MeshBasicMaterial({ color: 0x000000 })); mo.position.set(0, -.02, .14); head.add(mo);
  const petals = [];
  for (let i = 0; i < 9; i++) {
    const p = new T.Group(); p.rotation.y = i / 9 * Math.PI * 2; p.position.set(0, .12, 0); head.add(p);
    const pm = new T.Mesh(new T.ConeGeometry(.09, .55, 5), leaf); pm.position.set(0, .26, .14); pm.scale.set(1, 1, .35); p.add(pm); petals.push({ p, pm });
  }
  sph(.06, 0, .3, 0, glowM, head);
  // hanging vines and spores
  const vines = [];
  for (let i = 0; i < 12; i++) { const v = new T.Group(); const a = i / 12 * Math.PI * 2; v.position.set(Math.cos(a) * .22, .45 - (i % 3) * .2, Math.sin(a) * .22 - .02); torso.add(v); cyl(.018, .01, 1.0 + (i % 4) * .25, 0, -.55 - (i % 4) * .12, 0, leaf, 4, v); vines.push(v); }
  const sg = new T.BufferGeometry(), sa = new Float32Array(70 * 3); for (let i = 0; i < 70; i++) { sa[i * 3] = rnd(-.9, .9); sa[i * 3 + 1] = rnd(.2, 2.8); sa[i * 3 + 2] = rnd(-.9, .9); }
  sg.setAttribute('position', new T.BufferAttribute(sa, 3)); const spores = new T.Points(sg, new T.PointsMaterial({ color: 0xc8ff70, size: .05, transparent: true, opacity: .8 })); g.add(spores);
  const gl = new T.PointLight(0x9dff6a, .9, 6, 1.6); gl.position.set(0, 1.7, .5); g.add(gl);
  g.scale.setScalar(1.1); g.userData = { torso, head, arms, petals, vines, pod, spores, glow: gl };
  return g;
}
function animatePlantMan(g, dt, openT, moving) {
  const u = g.userData, t = S.time;
  u.petals.forEach((p, i) => { p.p.rotation.x = lerp(p.p.rotation.x, -(.15 + openT * 1.0 + Math.sin(t * 2 + i) * .05), dt * 3); });
  u.vines.forEach((v, i) => { v.rotation.x = Math.sin(t * 1.6 + i) * .18 + (moving ? .25 : 0); v.rotation.z = Math.cos(t * 1.3 + i * 1.7) * .18; });
  u.arms.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * (.12 + Math.sin(t * (moving ? 3 : 1) + i * 2) * .08); a.rotation.x = moving ? Math.sin(t * 3 + i * 3) * .35 : .05; });
  u.pod.scale.setScalar(1 + Math.sin(t * 6) * .18 + openT * .3); u.glow.intensity = .6 + openT * 1.6 + Math.sin(t * 6) * .15;
  u.head.rotation.z = Math.sin(t * .9) * .12 + (moving ? Math.sin(t * 7) * .06 : 0); u.spores.rotation.y += dt * .3;
  u.torso.rotation.x = .22 + Math.sin(t * 1.2) * .03;
}

/* ═════════════════════════ DEMO — THE GREENHOUSE (the Concord Program) ═════════════════════════ */
const ch4 = {
  name: ['Demo', 'The Greenhouse'],
  build() {
    scene.fog.color.set(0x050d08); scene.fog.density = .045; scene.background.set(0x050d08);
    amb.color.set(0x3a6a48); amb.intensity = .75; moon.intensity = .55; moon.color.set(0x8aa0d0);
    this.notes = 0; this.awake = false; this.exitOpen = false; this.pods = [];
    const tile = texChecker(), wp = texWall('#2e3a2e', '#26322a');
    slab(22, 18, 0, 0, 0, tile, 2); const roof = new T.Mesh(new T.PlaneGeometry(22, 18), new T.MeshLambertMaterial({ color: 0x6a8a7a, transparent: true, opacity: .14, side: T.DoubleSide })); roof.rotation.x = Math.PI / 2; roof.position.y = 4.6; world.add(roof);
    for (let x = -11; x <= 11; x += 5.5) box(.12, .12, 18, x, 4.6, 0, mat({ color: 0x1a221c }), false);
    for (let z = -9; z <= 9; z += 4.5) box(22, .12, .12, 0, 4.6, z, mat({ color: 0x1a221c }), false);
    wallBox(22.4, 4.6, .2, 0, 9.1, tmat(wp, 6, 1.5)); wallBox(.2, 4.6, 18.4, 11.1, 0, tmat(wp, 5, 1.5)); wallBox(.2, 4.6, 18.4, -11.1, 0, tmat(wp, 5, 1.5));
    wallBox(10.4, 4.6, .2, -5.8, -9.1, tmat(wp, 3, 1.5)); wallBox(10.4, 4.6, .2, 5.8, -9.1, tmat(wp, 3, 1.5)); box(1.2, 2.3, .2, 0, 3.45, -9.1, tmat(wp, 1, 1), false);
    // overgrown planter beds (the mutated crops)
    const soil = mat({ color: 0x2a1c12 }), green = mat({ color: 0x2f7a38, emissive: 0x0a2a10 });
    [[-6.5, -4.5], [0, -4.5], [6.5, -4.5], [-6.5, 2.5], [6.5, 2.5]].forEach(([x, z]) => {
      box(5, .7, 1.4, x, .35, z, soil); for (let i = 0; i < 16; i++) { const h = rnd(.6, 2.2), c = cyl(.0, rnd(.08, .25), h, x + rnd(-2.3, 2.3), .7 + h / 2, z + rnd(-.5, .5), green, 5); c.rotation.z = rnd(-.3, .3); if (i % 5 === 0) { const b = sph(.12, c.position.x, .7 + h, c.position.z, new T.MeshBasicMaterial({ color: 0xb4ff5a })); this.pods.push(b); } }
    });
    // gene tanks with figures growing inside
    [[-9.5, -7], [9.5, -7], [-9.5, 7], [9.5, 7], [0, 7.8]].forEach(([x, z], i) => {
      cyl(.9, .9, .2, x, .1, z, mat({ color: 0x222 }), 14); cyl(.9, .9, .2, x, 3.5, z, mat({ color: 0x222 }), 14);
      const glass = cyl(.85, .85, 3.3, x, 1.8, z, new T.MeshLambertMaterial({ color: 0x3aff7a, transparent: true, opacity: .22, emissive: 0x0a4a1a }), 14);
      const fig = cyl(.12, .22, 1.8, x, 1.7, z, mat({ color: 0x0a1a0c }), 7); sph(.17, x, 2.75, z, mat({ color: 0x0a1a0c })); this.pods.push(fig);
      colliders.push({ x0: x - .9, x1: x + .9, z0: z - .9, z1: z + .9, on: true }); pointLight(0x4aff8a, 1.1, 10, x, 2.4, z);
    });
    // desks with the program's notes
    const lines = [
      ['Day 1. Hunger ended in the first ward. Crops that grow in the dark on a lamp the size of a thumb. We are going to fix everything.', 'Take the first page'],
      ['Day 214. Cooperation genes from the vine families. No more violence in the volunteers. They smile with their whole faces. They do not blink.', 'Take the second page'],
      ['Day 400. They are not sleeping. They are rooting. The city calls it the Improvement. Do not turn on the lights. They follow light.', 'Take the third page'],
    ];
    [[-8.5, 4.2], [8.5, -1.5], [0, 0.2]].forEach(([x, z], i) => {
      box(2.2, .9, 1, x, .45, z, mat({ map: texWood(true) })); const note = new T.Group(); box(.4, .02, .3, 0, .01, 0, mat({ color: 0xeee6cc, emissive: 0x5a5440 }), false, note); const nl = new T.PointLight(0xfff0c0, .9, 5, 1.6); nl.position.y = .4; note.add(nl); note.position.set(x, 1.0, z); world.add(note);
      const it = addInteract(note, lines[i][1], () => { world.remove(note); it.on = false; this.notes++; say(lines[i][0], 9500); A.thump(.6); if (this.notes === 1) this.wake(); if (this.notes >= 3) later(9800, () => this.unlock()); }, 2.4);
    });
    // exit hatch (north)
    this.door = makeDoor(-.6, -9.1, 1.2, 2.3, true, 0, 0x20402a); this.doorCol = { x0: -.6, x1: .6, z0: -9.2, z1: -9.0, on: true }; colliders.push(this.doorCol); this.door.speed = 1;
    this.exitLight = pointLight(0xffffff, 0, 8, 0, 1.6, -8.2);
    // the Verdant: rooted among the beds until the first page is taken
    this.mon = makePlantMan(); this.mon.position.set(9, 0, -2.5); this.mon.rotation.y = -Math.PI / 2; world.add(this.mon);
    this.mon.userData.glow.intensity = .2; this.mon.userData.glow.distance = 3;
    player.x = 0; player.z = 7.2; player.yaw = 0; player.pitch = 0; this.start = { x: 0, z: 7.2 }; this.done = false;
    addEcho('e8', -4, 5, 'A volunteer, half-rooted: "The loan is paid in full. I am the collateral."');
    addEcho('e9', 5, -6, 'Mara Ilves, quieter now: "She is still small. Please water her first."');
    later(1200, () => say('A greenhouse. Every tank in it is full.'));
    later(7000, () => say('One of the plants by the east bed has a spine. Do not light it.', 5000));
  },
  wake() {
    this.awake = true; A.sting(.9); S.spike = .6; S.flash = .3;
    later(1500, () => say('It grows toward light. Your flashlight is a dinner bell. The dark is slower, but heavier.', 6500));
  },
  unlock() { this.exitOpen = true; this.doorCol.on = false; this.door.target = 1.5; this.exitLight.intensity = 1.6; A.creak(3, .07); say('The hatch opens. The way out smells of cut grass.', 5000); },
  caught() {
    if (S.fadeTarget === 0) return; S.fadeTarget = 0; S.flash = 1; A.sting(1.2); say('It was kind about it. That was the worst part.', 3500);
    setTimeout(() => { player.x = this.start.x; player.z = this.start.z; player.yaw = 0; this.mon.position.set(rnd(-4, 4) + 8, 0, -4); S.sanity = Math.max(S.sanity, .6); S.fadeTarget = 1; S.flash = 0; }, 1700);
  },
  update(dt) {
    this.pods.forEach((p, i) => { if (p.scale) p.scale.setScalar(1 + Math.sin(S.time * 2 + i) * .06); });
    animateDoor(this.door, dt); S.wind = .03;
    const m = this.mon, dx = player.x - m.position.x, dz = player.z - m.position.z, d = Math.hypot(dx, dz) || 1, lit = S.flashlightOn;
    let moving = false, open = 0;
    if (this.awake) {
      const run = Math.hypot(player.vx, player.vz) > 3.6;
      let sp = lit ? 2.05 : .55; if (run) sp += .9; if (S.eye > .5) sp *= .7;
      const p = { x: m.position.x + dx / d * sp * dt, z: m.position.z + dz / d * sp * dt }; resolve(p, .5); m.position.x = p.x; m.position.z = p.z; moving = true;
      m.rotation.y = Math.atan2(dx, dz); open = clamp(1 - d / 9, 0, 1);
      S.scrape = lerp(S.scrape, clamp(.4 - d * .02, .04, .4) * (lit ? 1.3 : .6), dt * 5);
      S.tension = Math.max(S.tension, clamp(1 - d / 14, 0, 1));
      if (!lit) S.sanity -= dt * .018; else if (d > 9) S.sanity += dt * .02; else S.sanity -= dt * .01;
      if (S.eye > .5) S.sanity += dt * .08;
      if (d < 1.15) this.caught();
    } else { m.rotation.z = Math.sin(S.time * .8) * .01; }
    animatePlantMan(m, dt, open, moving);
    if (S.sanity <= 0) { S.sanity = .5; this.caught(); }
    S.sanity = clamp(S.sanity, 0, 1); S.insanBase = this.notes * .05;
    if (this.exitOpen && player.z < -9.6 && !this.done) { this.done = true; S.fadeTarget = 0; later(1200, () => showEnd('End of the demo. The Concord Program is still improving the city. The Verdant is still growing.')); }
  },
};

/* ═════════════════════════ WAKING — THE OXYGEN TAX BUREAU (Papers, Please-style interlude) ═════════════════════════ */
const TODAY = '14.03.47';
const dnum = s => { const [d, m, y] = s.split('.').map(Number); return y * 10000 + m * 100 + d; };
function textTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new T.CanvasTexture(c); t.userData = { c, g }; return t; }
function makeCitizen(coat, o = {}) {
  const g = new T.Group(), cm = mat({ color: coat }), dark = mat({ color: 0x1c1c1e }), skin = mat({ color: o.skin || 0xb89a80 });
  cyl(.08, .09, .85, -.1, .42, 0, dark, 6, g); cyl(.08, .09, .85, .1, .42, 0, dark, 6, g);
  cyl(.2, .27, .85, 0, 1.22, 0, cm, 9, g); sph(.14, 0, 1.78, 0, skin, g);
  [-1, 1].forEach(s => { const a = cyl(.05, .045, .75, s * .26, 1.18, 0, cm, 6, g); a.rotation.z = s * .1; });
  if (!o.noMask) { box(.17, .12, .08, 0, 1.72, .12, mat({ color: 0x2e2e30 }), false, g); const f = cyl(.05, .05, .09, 0, 1.68, .19, mat({ color: 0x6a6a70 }), 8, g); f.rotation.x = Math.PI / 2; }
  cyl(.08, .08, .55, 0, 1.25, -.27, mat({ color: o.tank || 0x8a909a }), 8, g);
  if (o.pin) sph(.035, .12, 1.45, .2, new T.MeshBasicMaterial({ color: 0xd8f070 }), g);
  if (o.child) { const k = makeCitizen(0x6a5a7a, {}); k.scale.setScalar(.55); k.position.set(.45, 0, .1); g.add(k); }
  return g;
}
const APPS = [
  { name: 'Teo Barsk', id: 'BR-2217', exp: '02.09.47', L: 30, rName: 'Teo Barsk', rId: 'BR-2217', paid: 360, seal: true, coat: 0x5a4a3a, say: 'Morning, inspector. Same as every week.', res: 'He counts his breaths on the stairs so the meter does not run out.' },
  { name: 'Ines Calder', id: 'CL-0912', exp: '11.03.47', L: 18, rName: 'Ines Calder', rId: 'CL-0912', paid: 216, seal: true, coat: 0x3a4a5a, say: 'The renewal office was closed. It is always closed.', res: 'She has been holding her breath in the lift to save litres.' },
  { name: 'Pavel Roo', id: 'RO-4410', exp: '30.06.47', L: 22, rName: 'Pavol Roo', rId: 'RO-4410', paid: 264, seal: true, coat: 0x4a3a2a, say: 'That is a typo. The clerk spelled it wrong. Please.', res: "It is his brother's receipt. His brother is in a tank now." },
  { name: 'Nils Andt', id: 'AN-7781', exp: '19.12.47', L: 24, rName: 'Nils Andt', rId: 'AN-7781', paid: 288, seal: true, coat: 0x2a3a2a, say: 'Quick one today, I hope.', res: 'He is relieved. He will not be relieved next month.' },
  { name: 'Lene Okafor', id: 'OK-3302', exp: '08.08.47', L: 25, rName: 'Lene Okafor', rId: 'OK-3302', paid: 300, seal: true, coat: 0x6a3a3a, rate: 15.6, say: 'I paid this morning! The price was different this morning!', res: 'Inflation took a week of her breathing in four hours.' },
  { name: 'Mara Ilves', id: 'IL-5120', exp: '01.05.47', L: 30, rName: 'Mara Ilves', rId: 'IL-5120', paid: 120, seal: true, loan: true, child: true, directive: true, coat: 0x4a4a5a, say: 'The Concord man said the loan covers both of us. My daughter and me.', res: 'She signed where the paper said VOLUNTEER. She thought it meant the hospital.' },
  { name: 'Ruta Vey', id: 'VE-0001', exp: '27.10.47', L: 20, rName: 'Ruta Vey', rId: 'VE-0001', paid: 320, seal: false, mole: true, coat: 0x2a2a2a, say: 'Read the note. Please. Read the note.', res: 'She has seen the greenhouse from the inside, and she is still afraid of light.' },
  { name: 'Kasia Dorn', id: 'DO-0088', exp: '31.12.49', L: 120, rName: 'Kasia Dorn', rId: 'DO-0088', paid: 2000, seal: true, pin: true, coat: 0xa08a5a, say: 'Do hurry. My driver is breathing on the meter.', res: 'She owns shares in Concord. Her garden is enormous, and it whispers.' },
  { name: 'Josef Dunmore', id: 'DU-1938', exp: '15.04.47', L: 20, rName: 'Josef Dunmore', rId: 'DU-1938', paid: 312, seal: true, coat: 0x3a3a3a, rate: 18.9, say: 'Fifty years I have breathed this city. Fifty years.', res: 'He would sign anything to see his garden again. He does not know he would become it.' },
  { name: 'Aurel Ressel', id: 'RS-0909', exp: '14.03.48', L: 42, rName: 'Aurel Ressel', rId: 'RS-0909', paid: 0, seal: true, loan: true, self: true, noMask: true, coat: 0x24262a, say: '…', res: 'The ringing is not in your ears. It never was. It is everyone you sent away, at once.' },
];
const chOffice = {
  name: ['Waking', 'The Oxygen Tax Bureau'],
  build() {
    scene.fog.color.set(0x2a1f16); scene.fog.density = .045; scene.background.set(0x2a1f16);
    amb.color.set(0x9a8a72); amb.intensity = .8; moon.intensity = 0;
    S.seated = true; S.uiMode = true; S.flashlightOn = false; document.body.classList.add('office');
    try { document.exitPointerLock(); } catch (e) { /* ignore */ }
    const wp = texWall('#55524a', '#4a4840'), W = (w, h, d, x, y, z) => box(w, h, d, x, y, z, tmat(wp, Math.max(w, d) / 2, h / 2), false);
    // booth
    slab(4, 3.4, 0, 0, .4, texNoise('#2a2622', 14)); slab(4, 3.4, 0, 2.8, .4, texNoise('#1e1c1a', 10));
    W(.9, 2.8, .2, -1.55, 1.4, -1.3); W(.9, 2.8, .2, 1.55, 1.4, -1.3); W(2.2, 1.0, .2, 0, .5, -1.3); W(2.2, .6, .2, 0, 2.5, -1.3);
    W(.2, 2.8, 3.4, -2.05, 1.4, .4); W(.2, 2.8, 3.4, 2.05, 1.4, .4); W(4.2, 2.8, .2, 0, 1.4, 2.1);
    const glass = new T.Mesh(new T.PlaneGeometry(2.2, 1.2), new T.MeshLambertMaterial({ color: 0x9ab0a0, transparent: true, opacity: .12 })); glass.position.set(0, 1.6, -1.31); world.add(glass);
    box(.3, .14, .02, 0, 1.08, -1.2, mat({ color: 0x777 }), false);
    const desk = mat({ map: texWood(true) }); box(2.6, .07, .9, 0, .82, -.8, desk, false); box(2.6, .8, .06, 0, .4, -.36, desk, false);
    cyl(.05, .06, .1, -.9, .91, -.7, mat({ color: 0x2a6a2a }), 8); cyl(.05, .06, .1, -.7, .91, -.7, mat({ color: 0x7a1a1a }), 8); cyl(.05, .06, .1, -.5, .91, -.7, mat({ color: 0x2a5a46 }), 8);
    for (let i = 0; i < 5; i++) { const pp = box(.3, .005, .4, .5 + rnd(-.1, .1), .86 + i * .006, -.75 + rnd(-.05, .05), mat({ color: 0xe0d6bc }), false); pp.rotation.y = rnd(-.3, .3); }
    pointLight(0xffd8a0, 1.2, 5, .6, 1.6, -.4);
    // rate board above the window + posters
    this.board = textTex(512, 128, () => {}); this.drawBoard(12.0, false);
    const bd = new T.Mesh(new T.PlaneGeometry(1.6, .4), new T.MeshBasicMaterial({ map: this.board })); bd.position.set(0, 2.45, -1.19); world.add(bd);
    const poster = (txt, sub, col, x, ry) => { const tx = textTex(256, 360, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = '#f2ecd8'; g.font = 'bold 30px Georgia'; txt.forEach((l, i) => g.fillText(l, 18, 70 + i * 38)); g.font = '15px Georgia'; sub.forEach((l, i) => g.fillText(l, 18, 270 + i * 20)); }); const m = new T.Mesh(new T.PlaneGeometry(.75, 1.05), new T.MeshLambertMaterial({ map: tx })); m.position.set(x, 1.65, .2); m.rotation.y = ry; world.add(m); };
    poster(['CONCORD', 'GREENING', 'LOANS'], ['Grow your future.', '0% interest*', '*collateral: biological estate', 'of the borrower.'], '#2f5a36', -1.94, Math.PI / 2);
    poster(['OXYGEN', 'IS A', 'PRIVILEGE'], ['Pay your share.', 'Report unmetered breathing.', '— Bureau of Breath'], '#5a2a22', 1.94, -Math.PI / 2);
    // the street outside
    slab(40, 30, 0, -.02, -16, texNoise('#2a2724', 18), 3);
    const winTex = textTex(128, 256, (g, w, h) => { g.fillStyle = '#18140f'; g.fillRect(0, 0, w, h); for (let y = 8; y < h; y += 22) for (let x = 8; x < w; x += 20) { g.fillStyle = Math.random() < .3 ? '#d8a050' : '#24201a'; g.fillRect(x, y, 10, 12); } });
    [[-9, -10], [-10, -22], [9, -12], [11, -24], [-2, -30], [5, -32]].forEach(([x, z]) => box(6, 14, 6, x, 7, z, mat({ map: winTex, emissive: 0x2a1c0a, emissiveMap: winTex }), false));
    const bb = textTex(512, 192, (g, w, h) => { g.fillStyle = '#c8b070'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a1a10'; g.font = 'bold 52px Georgia'; g.fillText('BREATHE RESPONSIBLY', 18, 80); g.font = '26px Georgia'; g.fillText('Every litre counted. Every citizen improved.', 22, 140); });
    const bbm = new T.Mesh(new T.PlaneGeometry(9, 3.4), new T.MeshBasicMaterial({ map: bb, color: 0x9a8a70 })); bbm.position.set(0, 7, -27); world.add(bbm);
    pointLight(0xffa060, 1.6, 16, -3, 4, -6); pointLight(0xffa060, 1.3, 16, 3.5, 4, -13); pointLight(0xffd0a0, 1.3, 4, 0, 2.3, -2.9);
    box(.06, 1, 8, 1.3, .5, -7, mat({ color: 0x555 }), false);
    // citizens
    this.apps = APPS.map((a, i) => Object.assign({}, a, { g: null, dest: null }));
    this.apps.forEach((a, i) => { a.g = makeCitizen(a.coat, a); world.add(a.g); const q = this.queuePos(i, 0); a.g.position.set(q.x, 0, q.z); a.dest = q; });
    this.cur = -1; this.rate = 12.0; this.directive = false; this.correct = 0; this.cit = 0; this.ready = false; this.finished = false;
    player.x = 0; player.z = .45; player.yaw = 0; player.pitch = -.1;
    $('office').classList.remove('hidden'); $('bRefer').style.display = 'none'; $('ofDocs').innerHTML = ''; this.renderRules(); this.hud();
    later(800, () => say('Booth 9. Bureau of Breath. Your ears are ringing again.', 4500));
    later(3200, () => this.next());
  },
  queuePos(i, cur) { const k = i - cur - 1; return { x: 2.1 + k * .35, z: -3.2 - k * 1.25 }; },
  drawBoard(rate, alert) {
    const { g } = this.board.userData; g.fillStyle = alert ? '#3a0a08' : '#0c0a08'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = alert ? '#ff6a4a' : '#ffb040'; g.font = 'bold 30px Courier New'; g.fillText('O2 TAX RATE', 20, 44); g.font = 'bold 54px Courier New'; g.fillText(rate.toFixed(1) + ' ₵/L', 20, 106);
    g.font = '20px Courier New'; g.fillText(alert ? 'REVISED' : 'TODAY ' + TODAY, 330, 44); this.board.needsUpdate = true;
  },
  renderRules() {
    $('ofRules').innerHTML = `<b>BUREAU OF BREATH — RULES</b><ol>
      <li>Permit must not be expired (today ${TODAY}).</li><li>Name and ID must match on permit and receipt.</li>
      <li>Permit must carry the Bureau seal.</li><li>Paid ≥ litres × current rate (<b>${this.rate.toFixed(1)}</b> ₵/L).</li>
      ${this.directive ? '<li class="new"><b>Directive 7-C:</b> holders of a Concord Greening Loan must be <b>REFERRED</b>. Do not approve. Do not deny.</li>' : ''}</ol>
      <small>Keys: 1 approve · 2 deny${this.directive ? ' · 3 refer' : ''} · hold R to listen</small>`;
  },
  hud() { $('ofTop').innerHTML = `<span>Booth 9</span><span>${TODAY}</span><span>Rate <b>${this.rate.toFixed(1)} ₵/L</b></span><span>Applicant ${Math.max(0, this.cur + 1)}/${APPS.length}</span><span>Citations ${this.cit}</span>`; },
  msg(t, bad) { const el = $('ofMsg'); el.textContent = t; el.className = bad ? 'bad on' : 'on'; clearTimeout(this.msgT); this.msgT = setTimeout(() => el.className = '', 5200); },
  docs(a) {
    const seal = a.seal ? '<span class="seal">B</span>' : '<span class="seal none"></span>';
    let h = `<div class="doc permit"><h4>OXYGEN PERMIT</h4>Name: <b>${a.name}</b><br>ID: ${a.id}<br>Quota: ${a.L} L / week<br>Expires: <b>${a.exp}</b><br>Seal: ${seal}${a.pin ? '<br><i>✦ Concord shareholder</i>' : ''}</div>`;
    h += `<div class="doc receipt"><h4>O2 TAX RECEIPT</h4>Name: <b>${a.rName}</b><br>ID: ${a.rId}<br>Litres: ${a.L}<br>Paid: <b>${a.paid.toFixed(2)} ₵</b><br><small>Rate at purchase: ${a.rate ? (a.rate === 15.6 ? '12.0' : '15.6') : this.rate.toFixed(1)}</small></div>`;
    if (a.loan) h += `<div class="doc loan"><h4>CONCORD GREENING LOAN</h4>Borrower: <b>${a.name}</b><br>Amount: ${a.self ? '1 200' : '400'} ₵<br>Interest: 0%*<br><small>*The undersigned pledges, as collateral, the biological estate of the borrower and dependants.</small><br>Signed: <i>${a.name}</i> — VOLUNTEER ✓${a.self ? '<br><b>Dated: 15.03.47</b>' : ''}</div>`;
    if (a.mole) h += `<div class="doc note">Inspector — the seal is missing because the Bureau stopped issuing them to people like me. Concord is not growing food from volunteers. It is growing volunteers into food. Let me through.<br>— M</div>`;
    return h;
  },
  next() {
    this.cur++; this.hud();
    if (this.cur >= this.apps.length) return;
    const a = this.apps[this.cur];
    this.apps.forEach((b, i) => { if (i > this.cur) b.dest = this.queuePos(i, this.cur); });
    a.dest = { x: 0, z: -2.05 };
    if (a.rate) { this.rate = a.rate; this.drawBoard(this.rate, true); setTimeout(() => this.drawBoard(this.rate, false), 2500); A.tone(880, .25, .08, 'square'); A.tone(660, .35, .08, 'square', .3); this.msg(`RATE REVISED → ${this.rate.toFixed(1)} ₵/L (Inflation Adjustment Act)`); this.renderRules(); }
    if (a.directive) { this.directive = true; $('bRefer').style.display = ''; this.renderRules(); later(1200, () => this.msg('NEW DIRECTIVE 7-C: Greening Loan holders are to be referred to Concord.')); }
    later(2300, () => {
      if (S.chapter !== 5) return;
      $('ofDocs').innerHTML = this.docs(a); this.ready = true; A.burst(3000, 2, .08, .08);
      if (a.self) { S.ring = .03; S.spike = .5; say('He is not wearing a mask. He has your face. Your ears are screaming.', 5500); }
      else say(`${a.name}: "${a.say}"`, 5000);
    });
  },
  expected(a) {
    if (this.directive && a.loan) return 'refer';
    return this.violations(a).length ? 'deny' : 'approve';
  },
  violations(a) {
    const v = [];
    if (dnum(a.exp) < dnum(TODAY)) v.push('the permit was expired');
    if (a.name !== a.rName) v.push('the names did not match');
    if (a.id !== a.rId) v.push('the IDs did not match');
    if (!a.seal) v.push('the permit had no Bureau seal');
    if (a.paid + 1e-6 < a.L * this.rate) v.push(`the payment was short (${a.paid} < ${(a.L * this.rate).toFixed(1)})`);
    return v;
  },
  decide(kind) {
    if (!this.ready || S.chapter !== 5) return; this.ready = false;
    const a = this.apps[this.cur], exp = this.expected(a), ok = kind === exp;
    const st = document.createElement('div'); st.className = 'stamp ' + kind; st.textContent = { approve: 'APPROVED', deny: 'DENIED', refer: 'REFERRED' }[kind]; $('ofDocs').appendChild(st);
    A.thump(.9); A.burst(400, 1, .15, .4, 'lowpass');
    if (ok) this.correct++;
    else {
      this.cit++; S.citations++;
      const why = exp === 'refer' ? 'Directive 7-C: Greening Loan holders must be referred.' : exp === 'approve' ? (kind === 'refer' ? 'Referral without a Greening Loan contract.' : 'Wrongful denial: the documents were in order.') : (kind === 'refer' ? 'Referral without a Greening Loan contract.' : 'Approved although ' + this.violations(a)[0] + '.');
      later(700, () => this.msg('CITATION — ' + why, true));
    }
    if (a.mole && kind === 'approve') { S.moleHelped = true; later(2000, () => say('She slips a seed through the slot. It is warm, and it hums at your frequency.', 5000)); }
    S.ring = kind === 'approve' ? .008 : .024; if (kind !== 'approve') A.whisperBurst(.06);
    later(1300, () => say('You hear it ringing: ' + a.res, 6500));
    a.dest = kind === 'approve' ? { x: -6, z: -4 } : kind === 'refer' ? { x: -2.5, z: -12 } : { x: 6, z: -7 };
    if (kind === 'refer') { a.referred = true; later(1500, () => { S.flash = .15; }); }
    this.hud();
    if (a.self) { later(5200, () => this.finish()); return; }
    later(3600, () => { if (S.chapter === 5) { $('ofDocs').innerHTML = ''; this.next(); } });
  },
  finish() {
    if (this.finished) return; this.finished = true;
    S.ring = .035; S.flash = .6; A.sting(.9);
    const wage = 400 + this.correct * 10 - this.cit * 15, o2 = 42 * this.rate, rent = 120, bal = wage - o2 - rent;
    $('sumBody').innerHTML = `Processed ${APPS.length} · correct ${this.correct} · citations ${this.cit}<br><br>
      Wage (400 + 10 per correct − 15 per citation): <b>${wage.toFixed(1)} ₵</b><br>
      Your oxygen tax (you and your mother, 42 L × ${this.rate.toFixed(1)}): <b>−${o2.toFixed(1)} ₵</b><br>
      Rent: <b>−${rent} ₵</b><br><br>Balance: <b class="neg">${bal.toFixed(1)} ₵</b><br><br>
      Under your door: a Concord Greening Loan offer. Pre-filled. Pre-signed.<br><i>Volunteer: A. Ressel.</i>${S.moleHelped ? '<br><br>In your pocket, the seed is still humming.' : ''}`;
    later(1800, () => { $('office').classList.add('hidden'); $('ofSummary').classList.remove('hidden'); });
  },
  leave() {
    $('ofSummary').classList.add('hidden'); S.seated = false; S.uiMode = false; S.flashlightOn = true; document.body.classList.remove('office');
    goChapter(2); lockPointer();
  },
  update(dt) {
    S.wind = .05; S.tension = .1; S.insanBase = .05 + this.cit * .04;
    this.apps.forEach(a => {
      if (!a.g || !a.dest) return; const dx = a.dest.x - a.g.position.x, dz = a.dest.z - a.g.position.z, d = Math.hypot(dx, dz);
      if (d > .03) { const sp = Math.min(d, 1.3 * dt); a.g.position.x += dx / d * sp; a.g.position.z += dz / d * sp; a.g.rotation.y = Math.atan2(dx, dz); a.g.position.y = Math.abs(Math.sin(S.time * 8)) * .03; }
      else { a.g.position.y = 0; a.g.rotation.y = lerp(a.g.rotation.y, 0, dt * 3); if (a.referred) a.g.visible = false; }
    });
  },
};

/* ═════════════════════════ COMBAT SESSIONS — 2.5D, Hotline Miami × Superhot ═════════════════════════
   Top-down, one hit kills everyone, including you. Time moves only when you move (when you breathe).
   Map legend: # wall · o planter (low, shoot over it) · P player · m melee orderly · g gunner · v verdant · e random · w weapon · X exit */
const CMAPS = [
  { name: 'Floor 1 — Intake', a: '#2a0c2a', b: '#3a1038', line: '#ff3aa0', glow: 0xff3aa0, map: [
    '####################',
    '#P.....#...........#',
    '#......#....m......#',
    '#..w...#...........#',
    '#......####.####...#',
    '#..................#',
    '#####.#####...g....#',
    '#.......#.....######',
    '#..m....#..........#',
    '#............e.....#',
    '#...e...#.........X#',
    '####################'] },
  { name: 'Floor 2 — Greening Ward', a: '#06242a', b: '#0a3238', line: '#3affe0', glow: 0x3affe0, map: [
    '######################',
    '#P...#.......#.......#',
    '#....#...g...#...m...#',
    '#....#.......#.......#',
    '#..w.###.#####.###.###',
    '#....................#',
    '###.####...oo...####.#',
    '#......#...oo...#....#',
    '#..m...#........#..g.#',
    '#......###.##.###....#',
    '#...v.....e....m...X.#',
    '######################'] },
  { name: 'Floor 3 — The Nursery', a: '#0c2410', b: '#123418', line: '#b4ff5a', glow: 0xb4ff5a, map: [
    '########################',
    '#P.....o.....o.....v...#',
    '#..w...o..v..o.........#',
    '#......o.....o...g.....#',
    '#..........oo..........#',
    '#####.###......###.#####',
    '#.v...#..........#...m.#',
    '#.....#...oooo...#.....#',
    '#..g..#....v.....#..e..#',
    '#.........m...........X#',
    '########################'] },
];
const WEAP = {
  fists: { melee: true, range: 1.05, arc: 1.3, cd: .35, label: 'FISTS' },
  pipe: { melee: true, range: 1.6, arc: 1.7, cd: .45, label: 'PIPE' },
  pistol: { gun: true, ammo: 6, cd: .32, spread: .03, pellets: 1, label: 'PISTOL' },
  shotgun: { gun: true, ammo: 3, cd: .8, spread: .3, pellets: 6, label: 'SHOTGUN' },
};
function makeWeaponMesh(type) {
  const g = new T.Group();
  if (type === 'pipe') { const c = cyl(.035, .035, 1.0, 0, 0, .35, mat({ color: 0xb0b6c0, emissive: 0x202428 }), 6, g); c.rotation.x = Math.PI / 2; }
  else if (type === 'pistol') box(.08, .12, .34, 0, 0, .14, mat({ color: 0x2a2c30, emissive: 0x101010 }), false, g);
  else if (type === 'shotgun') box(.09, .1, .9, 0, 0, .36, mat({ color: 0x4a3420, emissive: 0x140c06 }), false, g);
  return g;
}
function makeFighter(type) {
  const g = new T.Group();
  const pal = { player: [0xe8eef4, 0x223038], melee: [0xff4a3a, 0x500a06], gunner: [0xff2244, 0x500612], verdant: [0x3adf5a, 0x0a4a14] }[type];
  const body = mat({ color: pal[0], emissive: pal[1], flatShading: true }), dark = mat({ color: 0x18181c });
  cyl(.09, .1, .8, -.12, .4, 0, type === 'player' ? dark : body, 5, g); cyl(.09, .1, .8, .12, .4, 0, type === 'player' ? dark : body, 5, g);
  const torso = new T.Mesh(new T.CylinderGeometry(.27, .2, .75, 6), type === 'player' ? mat({ color: 0x30343c, flatShading: true }) : body); torso.position.y = 1.15; g.add(torso);
  const head = new T.Mesh(new T.IcosahedronGeometry(.19, 0), body); head.position.y = 1.72; g.add(head);
  const arm = new T.Group(); arm.position.set(.3, 1.35, 0); g.add(arm);
  const a = cyl(.06, .05, .6, 0, 0, .3, type === 'player' ? mat({ color: 0x30343c }) : body, 5, arm); a.rotation.x = Math.PI / 2;
  const arm2 = new T.Group(); arm2.position.set(-.3, 1.35, 0); g.add(arm2);
  const b = cyl(.06, .05, .6, 0, -.28, .05, type === 'player' ? mat({ color: 0x30343c }) : body, 5, arm2);
  const hand = new T.Group(); hand.position.set(0, 0, .6); arm.add(hand);
  if (type === 'verdant') {
    for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2, pt = new T.Mesh(new T.ConeGeometry(.08, .38, 4), mat({ color: 0xb4ff5a, emissive: 0x2a6a10, flatShading: true })); pt.position.set(Math.cos(an) * .19, 1.86, Math.sin(an) * .19); pt.rotation.set(Math.sin(an) * .9, 0, -Math.cos(an) * .9); g.add(pt); }
  } else {
    box(.2, .14, .1, 0, 1.68, .15, dark, false, g);
    const f = cyl(.055, .055, .1, 0, 1.64, .22, type === 'player' ? new T.MeshBasicMaterial({ color: 0x8fe8ff }) : mat({ color: 0x555 }), 8, g); f.rotation.x = Math.PI / 2;
  }
  g.userData = { arm, arm2, hand, torso, color: pal[0] };
  return g;
}
const mouseNDC = new T.Vector2(0, 0); let mouseMoved = 0;
document.addEventListener('mousemove', e => { mouseNDC.x = e.clientX / window.innerWidth * 2 - 1; mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1; mouseMoved = 1; });
const chCombat = {
  name: ['Lucid Raid', 'Combat Sessions'], combat: true,
  build() {
    S.uiMode = true; S.flashlightOn = false; try { document.exitPointerLock(); } catch (e) { /* ignore */ }
    $('combat').classList.remove('hidden'); canvas.style.cursor = 'crosshair'; document.body.classList.add('combat');
    this.score = 0; this.clock = 0; this.kills = 0; this.deaths = 0; this.loadLevel(0);
  },
  loadLevel(n) {
    clearWorld(); this.level = n; this.levelScore = this.score;
    const L = CMAPS[n], rows = L.map, H = rows.length, W = Math.max(...rows.map(r => r.length)), C = 1.6;
    const rng = mulberry(session.seed * 31 + n * 7919);
    const P = (c, r) => ({ x: (c - (W - 1) / 2) * C, z: (r - (H - 1) / 2) * C });
    scene.fog.color.set(0x07050c); scene.fog.density = .012; scene.background.set(0x07050c);
    amb.color.set(0xc0b0d0); amb.intensity = 1.0; moon.intensity = .7; moon.color.set(0xffffff); moon.position.set(-4, 10, 6);
    const floorTex = mkCanvas(64, 64, (g, w, h) => { g.fillStyle = L.a; g.fillRect(0, 0, w, h); g.fillStyle = L.b; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); g.strokeStyle = L.line; g.globalAlpha = .35; g.strokeRect(.5, .5, 63, 63); g.globalAlpha = 1; noise(g, w, h, 10); });
    slab(W * C, H * C, 0, 0, 0, floorTex, C * 2);
    const wallM = mat({ color: 0x15121c, emissive: 0x06040a }), capM = new T.MeshBasicMaterial({ color: L.glow });
    rows.forEach((row, r) => {
      let c = 0;
      while (c < W) {
        if (row[c] === '#') { let e = c; while (e < W && row[e] === '#') e++; const a = P(c, r), b = P(e - 1, r), cx = (a.x + b.x) / 2, len = (e - c) * C; wallBox(len, 1.5, C, cx, a.z, wallM); box(len, .04, C, cx, 1.52, a.z, capM, false); c = e; }
        else c++;
      }
    });
    this.enemies = []; this.pickups = []; this.bullets = []; this.thrown = []; this.shards = [];
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const q = P(c, r);
      if (ch === 'o') { box(C * .85, .7, C * .85, q.x, .35, q.z, mat({ color: 0x3a2414 }), false); sph(.45, q.x, .85, q.z, mat({ color: 0x2f9a3a, emissive: 0x0a3a10, flatShading: true })); colliders.push({ x0: q.x - C * .42, x1: q.x + C * .42, z0: q.z - C * .42, z1: q.z + C * .42, on: true, noLos: true, low: true }); }
      if (ch === 'P') this.spawn = q;
      if (ch === 'w') this.addPickup(q.x, q.z, rng() < .5 ? 'pipe' : rng() < .5 ? 'pistol' : 'shotgun');
      if (ch === 'X') { this.exit = q; this.exitPad = cyl(.65, .65, .05, q.x, .03, q.z, new T.MeshBasicMaterial({ color: 0x333333 }), 20); }
      if ('mgve'.includes(ch)) { let t = { m: 'melee', g: 'gunner', v: 'verdant' }[ch]; if (ch === 'e') t = ['melee', 'gunner', 'verdant'][Math.floor(rng() * 3)]; this.addEnemy(t, q.x, q.z, rng); }
    }));
    this.p = { x: this.spawn.x, z: this.spawn.z, ang: Math.PI, r: .32, weapon: null, alive: true, cd: 0, swing: 0, vx: 0, vz: 0 };
    this.pm = makeFighter('player'); world.add(this.pm); this.pWeapon = null;
    this.halo = new T.PointLight(0x8fe8ff, .9, 7, 1.5); world.add(this.halo);
    this.muzzle = new T.PointLight(0xffd080, 0, 8, 1.5); world.add(this.muzzle);
    this.exitLight = new T.PointLight(L.glow, 0, 6, 1.5); this.exitLight.position.set(this.exit.x, 1.2, this.exit.z); world.add(this.exitLight);
    this.bulletGeo = new T.CylinderGeometry(.05, .05, .5, 5); this.bulletGeo.rotateX(Math.PI / 2);
    this.ts = .06; this.burst = 0; this.combo = 0; this.comboT = 0; this.cleared = false; this.deadT = 0; this.beatT = 0; this.beatI = 0;
    $('cbLevel').textContent = `${L.name}  ·  dream #${session.seed}`;
    this.msg('TIME MOVES WHEN YOU BREATHE', 2600);
    camera.position.set(this.p.x, 13, this.p.z + 7);
  },
  msg(t, ms) { const el = $('cbMsg'); el.textContent = t; el.classList.add('on'); clearTimeout(this.msgT); if (ms) this.msgT = setTimeout(() => el.classList.remove('on'), ms); },
  addPickup(x, z, type, ammo) {
    const g = makeWeaponMesh(type); g.position.set(x, .15, z); world.add(g);
    const ring = new T.Mesh(new T.RingGeometry(.35, .42, 20), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .03, z); world.add(ring);
    this.pickups.push({ g, ring, type, ammo: ammo ?? (WEAP[type].ammo || 0), x, z });
  },
  addEnemy(type, x, z, rng) {
    const g = makeFighter(type); g.position.set(x, 0, z); world.add(g);
    const wt = type === 'gunner' ? (rng() < .65 ? 'pistol' : 'shotgun') : type === 'melee' ? (rng() < .6 ? 'pipe' : null) : null;
    if (wt) g.userData.hand.add(makeWeaponMesh(wt));
    const e = { type, g, x, z, r: .34, ang: rng() * 6.28, alive: true, state: 'idle', react: 0, cd: rng(), wind: 0, weapon: wt, side: 0, sideT: 0, lastX: x, lastZ: z, bob: rng() * 6 };
    g.rotation.y = e.ang; this.enemies.push(e);
  },
  aimPoint() {
    const rc = new T.Raycaster(); rc.setFromCamera(mouseNDC, camera);
    const hit = new T.Vector3(); return rc.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -1.2), hit) ? hit : null;
  },
  spawnBullet(x, z, ang, speed, owner, kind) {
    const m = kind === 'spore' ? new T.Mesh(new T.SphereGeometry(.13, 8, 6), new T.MeshBasicMaterial({ color: 0xb4ff5a })) : new T.Mesh(this.bulletGeo, new T.MeshBasicMaterial({ color: owner === 'p' ? 0x8fe8ff : 0xff7a3a }));
    m.position.set(x, 1.3, z); m.rotation.y = ang; world.add(m);
    this.bullets.push({ m, x, z, vx: Math.sin(ang) * speed, vz: Math.cos(ang) * speed, owner, life: 4 });
  },
  fire() {
    const p = this.p; if (!p.alive || p.cd > 0 || S.paused) return;
    const w = WEAP[p.weapon ? p.weapon.type : 'fists']; this.burst = 1;
    if (w.melee) {
      p.cd = w.cd; p.swing = .22; A.burst(700, 1, .12, .25);
      this.enemies.forEach(e => {
        if (!e.alive) return; const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz); let da = Math.atan2(dx, dz) - p.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (d < w.range + .3 && Math.abs(da) < w.arc / 2 && !losBlocked(p.x, p.z, e.x, e.z)) this.kill(e, Math.atan2(dx, dz));
      });
      this.bullets.forEach(b => { if (b.owner !== 'e') return; const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz); let da = Math.atan2(dx, dz) - p.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); if (d < w.range + .5 && Math.abs(da) < w.arc / 2) { b.life = 0; this.spark(b.x, b.z, 0xffffff); A.tone(2400, .2, .05, 'square'); } });
    } else {
      if (p.weapon.ammo <= 0) { A.tone(1800, .05, .05, 'square'); p.cd = .2; this.msg('EMPTY — RIGHT CLICK TO THROW IT', 1400); return; }
      p.weapon.ammo--; p.cd = w.cd;
      for (let i = 0; i < w.pellets; i++) this.spawnBullet(p.x + Math.sin(p.ang) * .7, p.z + Math.cos(p.ang) * .7, p.ang + (Math.random() - .5) * w.spread, 24, 'p');
      this.muzzle.position.set(p.x + Math.sin(p.ang) * .9, 1.4, p.z + Math.cos(p.ang) * .9); this.muzzle.intensity = 3;
      A.burst(1400, .7, .18, .5); A.thump(.4); S.shake = .15;
    }
  },
  throwOrPick() {
    const p = this.p; if (!p.alive || S.paused) return;
    if (p.weapon) {
      const m = makeWeaponMesh(p.weapon.type); m.position.set(p.x, 1.2, p.z); world.add(m);
      this.thrown.push({ m, x: p.x + Math.sin(p.ang) * .5, z: p.z + Math.cos(p.ang) * .5, vx: Math.sin(p.ang) * 16, vz: Math.cos(p.ang) * 16, type: p.weapon.type, ammo: p.weapon.ammo, life: 1.2 });
      p.weapon = null; this.setHeld(null); this.burst = 1; A.burst(500, 1, .2, .2);
    } else {
      let best = null, bd = 1.4; this.pickups.forEach(k => { const d = Math.hypot(k.x - p.x, k.z - p.z); if (d < bd) { bd = d; best = k; } });
      if (best) { p.weapon = { type: best.type, ammo: best.ammo }; this.setHeld(best.type); world.remove(best.g); world.remove(best.ring); this.pickups.splice(this.pickups.indexOf(best), 1); A.tone(900, .08, .06, 'square'); this.burst = .6; }
    }
  },
  setHeld(type) { const h = this.pm.userData.hand; while (h.children.length) h.remove(h.children[0]); if (type) h.add(makeWeaponMesh(type)); },
  kill(e, dir) {
    if (!e.alive) return; e.alive = false; world.remove(e.g); this.kills++;
    this.combo = this.comboT > 0 ? this.combo + 1 : 1; this.comboT = 3; this.score += 100 * this.combo;
    const col = e.g.userData.color, sm = new T.MeshLambertMaterial({ color: col, emissive: col === 0x3adf5a ? 0x0a4a14 : 0x500808, flatShading: true, transparent: true, opacity: 1 });
    for (let i = 0; i < 18; i++) {
      const sh = new T.Mesh(new T.TetrahedronGeometry(rnd(.06, .16)), sm); sh.position.set(e.x + rnd(-.2, .2), rnd(.4, 1.8), e.z + rnd(-.2, .2)); world.add(sh);
      const a = dir + rnd(-.9, .9), sp = rnd(2, 7); this.shards.push({ m: sh, mat: sm, vx: Math.sin(a) * sp, vy: rnd(1, 5), vz: Math.cos(a) * sp, rx: rnd(-9, 9), rz: rnd(-9, 9), life: 1.6 });
    }
    const dec = new T.Mesh(new T.CircleGeometry(rnd(.5, .9), 12), new T.MeshBasicMaterial({ color: e.type === 'verdant' ? 0x2a8a2a : 0x7a0a1a, transparent: true, opacity: .8 }));
    dec.rotation.x = -Math.PI / 2; dec.position.set(e.x + Math.sin(dir) * .4, .02, e.z + Math.cos(dir) * .4); dec.scale.set(1, rnd(.6, 1.6), 1); world.add(dec);
    if (e.weapon) this.addPickup(e.x, e.z, e.weapon);
    A.burst(3200, .5, .35, .35); [1800, 2600, 3500].forEach((f, i) => A.tone(f * rnd(.9, 1.1), .25, .04, 'triangle', i * .03)); A.thump(.5);
    this.burst = Math.max(this.burst, .5);
    if (this.enemies.every(x => !x.alive)) { this.cleared = true; this.msg('FLOOR CLEAR — GET TO THE EXIT', 3000); A.chime(); }
  },
  spark(x, z, color) { for (let i = 0; i < 5; i++) { const sm = new T.MeshBasicMaterial({ color, transparent: true }); const sh = new T.Mesh(new T.TetrahedronGeometry(.05), sm); sh.position.set(x, 1.3, z); world.add(sh); const a = rnd(0, 6.28); this.shards.push({ m: sh, mat: sm, vx: Math.sin(a) * 3, vy: rnd(0, 2), vz: Math.cos(a) * 3, rx: 5, rz: 5, life: .4 }); } },
  die() {
    const p = this.p; if (!p.alive) return; p.alive = false; this.deaths++; S.flash = .7; A.sting(.8);
    this.pm.rotation.x = -Math.PI / 2; this.pm.position.y = .25;
    const dec = new T.Mesh(new T.CircleGeometry(1, 14), new T.MeshBasicMaterial({ color: 0x5a0a14, transparent: true, opacity: .85 })); dec.rotation.x = -Math.PI / 2; dec.position.set(p.x, .02, p.z); world.add(dec);
    this.msg('YOU WOKE UP — PRESS R OR CLICK TO DREAM IT AGAIN');
  },
  restart() { this.score = this.levelScore; this.loadLevel(this.level); },
  next() {
    if (this.level + 1 < CMAPS.length) { this.msg('BREATHE.', 900); setTimeout(() => { if (S.chapter === 6) { this.msg('BREATHE.', 900); } }, 1000); setTimeout(() => { if (S.chapter === 6) this.loadLevel(this.level + 1); }, 2000); this.exit = { x: 1e9, z: 1e9 }; return; }
    const bonus = Math.max(0, Math.round(3000 - this.clock * 12)), total = this.score + bonus - this.deaths * 200;
    const grade = total > 4200 ? 'S' : total > 3200 ? 'A' : total > 2200 ? 'B' : 'C';
    this.exit = { x: 1e9, z: 1e9 }; S.fadeTarget = 0;
    setTimeout(() => showEnd(`COMBAT SESSION CLEAR — grade <b>${grade}</b><br>score ${this.score} + time bonus ${bonus} − deaths ${this.deaths}×200 = <b>${total}</b><br>kills ${this.kills} · ${this.clock.toFixed(1)} s<br><br>M's voice, at your frequency: "Good. Now do it awake."`), 1200);
  },
  update(dt) {
    const p = this.p; S.sanity = 1; S.insanBase = .04; S.scrape = 0; S.wind = .02;
    this.clock += dt;
    // Superhot: time scale follows how much you move (and spikes when you act)
    const mv = p.alive ? Math.hypot(p.vx, p.vz) / 5.6 : 0;
    if (mouseMoved) { this.burst = Math.max(this.burst, .12); mouseMoved = 0; }
    const tgt = p.alive ? clamp(.05 + mv * .95 + this.burst, .05, 1) : .02;
    this.ts = lerp(this.ts, tgt, clamp(dt * 12, 0, 1)); this.burst = Math.max(0, this.burst - dt * 3.5);
    const sdt = dt * this.ts;
    // player
    if (p.alive) {
      let mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), mz = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
      if (keys.ArrowRight) mx += 1; if (keys.ArrowLeft) mx -= 1; if (keys.ArrowDown) mz += 1; if (keys.ArrowUp) mz -= 1;
      const l = Math.hypot(mx, mz) || 1, sp = 5.6;
      p.vx = lerp(p.vx, mx / l * sp * (mx || mz ? 1 : 0), clamp(dt * 14, 0, 1)); p.vz = lerp(p.vz, mz / l * sp * (mx || mz ? 1 : 0), clamp(dt * 14, 0, 1));
      p.x += p.vx * dt; p.z += p.vz * dt; resolve(p, p.r);
      const aim = this.aimPoint(); if (aim) p.ang = Math.atan2(aim.x - p.x, aim.z - p.z);
      p.cd = Math.max(0, p.cd - sdt); p.swing = Math.max(0, p.swing - dt);
      this.pm.position.set(p.x, Math.abs(Math.sin(this.clock * 12)) * .05 * mv, p.z); this.pm.rotation.y = p.ang;
      const u = this.pm.userData; u.arm.rotation.y = p.swing > 0 ? Math.sin((1 - p.swing / .22) * Math.PI) * -1.4 + .7 : 0;
      if (this.cleared && Math.hypot(p.x - this.exit.x, p.z - this.exit.z) < .9) this.next();
    }
    this.halo.position.set(p.x, 2.2, p.z); this.muzzle.intensity = Math.max(0, this.muzzle.intensity - dt * 40);
    if (this.exitPad) { this.exitPad.material.color.set(this.cleared ? (Math.sin(this.clock * 8) > 0 ? CMAPS[this.level].glow : 0xffffff) : 0x333333); this.exitLight.intensity = this.cleared ? 2 : 0; }
    // enemies
    this.enemies.forEach(e => {
      if (!e.alive) return;
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1, los = p.alive && d < 17 && !losBlocked(e.x, e.z, p.x, p.z);
      if (los) { e.lastX = p.x; e.lastZ = p.z; }
      if (e.state === 'idle') { e.ang += Math.sin(this.clock * .5 + e.bob) * sdt * .4; if (los && d < 12.5) { e.state = 'alert'; e.react = e.type === 'gunner' ? .5 : .25; A.tone(e.type === 'verdant' ? 300 : 520, .15, .05, 'square'); } }
      else {
        e.react -= sdt; e.cd -= sdt;
        const want = Math.atan2(e.lastX - e.x, e.lastZ - e.z); let da = want - e.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); e.ang += clamp(da, -8 * sdt, 8 * sdt);
        let speed = 0;
        if (e.type === 'gunner') {
          if (los && e.react <= 0) { if (e.cd <= 0 && Math.abs(da) < .25) { const sg = e.weapon === 'shotgun'; for (let i = 0; i < (sg ? 5 : 1); i++) this.spawnBullet(e.x + Math.sin(e.ang) * .7, e.z + Math.cos(e.ang) * .7, e.ang + (Math.random() - .5) * (sg ? .35 : .06), 11, 'e'); e.cd = sg ? 1.7 : 1.15; A.burst(1100, .7, .15, .3); } }
          else speed = 2.6;
        } else {
          speed = e.type === 'verdant' ? 2.0 : 3.5;
          if (e.type === 'verdant' && los && d > 3 && e.cd <= 0 && e.react <= 0) { this.spawnBullet(e.x, e.z, e.ang, 7, 'e', 'spore'); e.cd = 2.4; A.burst(400, 2, .25, .2); }
          if (d < 1.05 && p.alive && e.react <= 0) { e.wind += sdt; speed = 0; if (e.wind > .28) this.die(); } else e.wind = Math.max(0, e.wind - sdt);
        }
        if (Math.hypot(e.lastX - e.x, e.lastZ - e.z) < .4 && !los) speed = 0;
        if (speed > 0) {
          let mvA = e.ang; if (e.sideT > 0) { mvA += e.side * 1.3; e.sideT -= sdt; }
          const ox = e.x, oz = e.z; e.x += Math.sin(mvA) * speed * sdt; e.z += Math.cos(mvA) * speed * sdt; resolve(e, e.r);
          const moved = Math.hypot(e.x - ox, e.z - oz); if (sdt > .001 && moved < speed * sdt * .3 && e.sideT <= 0) { e.side = Math.random() < .5 ? -1 : 1; e.sideT = .5; }
          e.bob += sdt * 10;
        }
        e.g.userData.arm.rotation.x = e.wind > 0 ? -e.wind * 4 : 0;
      }
      e.g.position.set(e.x, Math.abs(Math.sin(e.bob)) * .05, e.z); e.g.rotation.y = e.ang;
    });
    // bullets (time-scaled)
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]; b.x += b.vx * sdt; b.z += b.vz * sdt; b.life -= sdt; b.m.position.set(b.x, 1.3, b.z);
      let dead = b.life <= 0;
      if (!dead) for (const c of colliders) if (c.on && !c.low && b.x > c.x0 && b.x < c.x1 && b.z > c.z0 && b.z < c.z1) { dead = true; this.spark(b.x, b.z, 0xffd080); break; }
      if (!dead && b.owner === 'p') for (const e of this.enemies) if (e.alive && Math.hypot(e.x - b.x, e.z - b.z) < .45) { this.kill(e, Math.atan2(b.vx, b.vz)); dead = true; break; }
      if (!dead && b.owner === 'e' && p.alive && Math.hypot(p.x - b.x, p.z - b.z) < .36) { this.die(); dead = true; }
      if (dead) { world.remove(b.m); this.bullets.splice(i, 1); }
    }
    // thrown weapons
    for (let i = this.thrown.length - 1; i >= 0; i--) {
      const t = this.thrown[i]; t.x += t.vx * sdt; t.z += t.vz * sdt; t.life -= sdt; t.m.position.set(t.x, 1.1, t.z); t.m.rotation.y += sdt * 20;
      let stop = t.life <= 0;
      for (const c of colliders) if (c.on && !c.low && t.x > c.x0 - .1 && t.x < c.x1 + .1 && t.z > c.z0 - .1 && t.z < c.z1 + .1) { stop = true; t.x -= t.vx * sdt * 2; t.z -= t.vz * sdt * 2; break; }
      for (const e of this.enemies) if (e.alive && Math.hypot(e.x - t.x, e.z - t.z) < .55) { this.kill(e, Math.atan2(t.vx, t.vz)); stop = true; break; }
      if (stop) { world.remove(t.m); this.addPickup(t.x, t.z, t.type, t.ammo); this.thrown.splice(i, 1); A.thump(.3); }
    }
    // shards
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s2 = this.shards[i]; s2.vy -= 9 * sdt; s2.m.position.x += s2.vx * sdt; s2.m.position.y = Math.max(.05, s2.m.position.y + s2.vy * sdt); s2.m.position.z += s2.vz * sdt;
      s2.m.rotation.x += s2.rx * sdt; s2.m.rotation.z += s2.rz * sdt; s2.life -= sdt; s2.mat.opacity = clamp(s2.life / .6, 0, 1);
      if (s2.life <= 0) { world.remove(s2.m); this.shards.splice(i, 1); }
    }
    this.pickups.forEach(k => { k.g.rotation.y += dt * 1.5; k.ring.material.opacity = .3 + Math.sin(this.clock * 4) * .2; });
    this.comboT -= dt * Math.max(this.ts, .35); if (this.comboT <= 0) this.combo = 0;
    // music: tempo and pitch follow time
    this.beatT -= dt * (.15 + .85 * this.ts);
    if (this.beatT <= 0) {
      this.beatT = .26; const i = this.beatI++, bass = [55, 55, 65.4, 55, 73.4, 55, 82.4, 73.4][i % 8] * (.5 + .5 * this.ts + .5);
      if (i % 2 === 0) A.thump(.35); A.tone(bass, .22, .06, 'sawtooth'); if (i % 2) A.burst(8000, .7, .03, .04 + .04 * this.ts);
    }
    // 2.5D camera with look-ahead toward the cursor
    const aim = this.aimPoint() || new T.Vector3(p.x, 0, p.z), tx = p.x + (aim.x - p.x) * .22, tz = p.z + (aim.z - p.z) * .22;
    camera.position.x = lerp(camera.position.x, tx, clamp(dt * 6, 0, 1)); camera.position.y = 13; camera.position.z = lerp(camera.position.z, tz + 7.5, clamp(dt * 6, 0, 1));
    S.shake = Math.max(0, (S.shake || 0) - dt); camera.position.x += (Math.random() - .5) * S.shake; camera.position.z += (Math.random() - .5) * S.shake;
    camera.lookAt(camera.position.x, 0, camera.position.z - 7.5); camera.fov = 50; camera.updateProjectionMatrix();
    // HUD
    const w = p.weapon ? WEAP[p.weapon.type].label + (WEAP[p.weapon.type].gun ? ' ' + p.weapon.ammo : '') : 'FISTS';
    $('cbScore').textContent = this.score + ' PTS'; $('cbCombo').textContent = this.combo > 1 ? this.combo + 'x COMBO' : ''; $('cbWeapon').textContent = w;
    $('cbTime').firstElementChild.style.width = (this.ts * 100).toFixed(0) + '%';
    post.mat.uniforms.listen.value = (1 - this.ts) * .22;
  },
};
const chapters = [ch0, ch1, ch2, ch3, ch4, chOffice, chCombat];

function goChapter(i) {
  S.chapter = i; currentCh = chapters[i];
  clearWorld(); watcher.g = null; watcher.active = false; ghost.g && (ghost.g.visible = false);
  S.scrape = 0; S.wading = false; S.spike = 0; S.input = true; S.fadeTarget = 1; S.sanity = Math.max(S.sanity, .7); S.flash = 0;
  A.stopBox(); torch.intensity = 1.7; lamp.intensity = 0; lamp.distance = 12;
  if (i !== 5) { $('office').classList.add('hidden'); S.seated = false; S.uiMode = false; document.body.classList.remove('office'); }
  if (i !== 6) { $('combat').classList.add('hidden'); canvas.style.cursor = ''; document.body.classList.remove('combat'); }
  currentCh.build(); card(/^[IVX]+$/.test(currentCh.name[0]) ? `Chapter ${currentCh.name[0]}` : currentCh.name[0], currentCh.name[1]);
  const t = (s => s); if (location.hash !== '#ch=' + i) try { history.replaceState(null, '', '#ch=' + i); } catch (e) { /* ignore */ }
}

/* ───────────────────────── input ───────────────────────── */
window.addEventListener('keydown', e => {
  if (e.repeat) return; keys[e.code] = true;
  if (e.code === 'KeyF' && S.running) { S.flashlightOn = !S.flashlightOn; A.burst(2000, 5, .04, .1); }
  if (e.code === 'KeyE' && S.running && S.input) useInteract();
  if (S.chapter === 6 && S.running) { if (e.code === 'KeyR') chCombat.restart(); if (e.code === 'KeyE') chCombat.throwOrPick(); if (e.code === 'Escape') { S.paused = !S.paused; $('pause').classList.toggle('hidden', !S.paused); } }
  if (S.chapter === 5 && S.running) { if (e.code === 'Digit1') chOffice.decide('approve'); if (e.code === 'Digit2') chOffice.decide('deny'); if (e.code === 'Digit3' && chOffice.directive) chOffice.decide('refer'); }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
let locked = false;
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && S.running && !S.endShown && !S.uiMode) { S.paused = true; $('pause').classList.remove('hidden'); }
});
document.addEventListener('mousemove', e => {
  if (!S.running || S.paused || !S.input) return;
  if (locked || e.buttons & 1) { player.yaw -= e.movementX * .0022; player.pitch = clamp(player.pitch - e.movementY * .0022, -1.35, 1.35); }
});
function lockPointer() { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
function startGame(ch = 0) {
  A.init(); $('menu').classList.add('hidden'); $('pause').classList.add('hidden'); $('end').classList.add('hidden'); S.endShown = false;
  if (!S.running) { S.running = true; S.sanity = 1; S.startCh = ch; S.heard = new Set(); S.moleHelped = false; S.citations = 0; goChapter(ch); } S.paused = false; if (!S.uiMode) lockPointer();
}
$('menu').addEventListener('click', () => startGame(0));
$('demoBtn').addEventListener('click', e => { e.stopPropagation(); startGame(4); });
$('officeBtn').addEventListener('click', e => { e.stopPropagation(); startGame(5); });
$('rerollBtn').addEventListener('click', e => { e.stopPropagation(); newSession(); });
$('bApprove').addEventListener('click', () => chOffice.decide('approve'));
$('bDeny').addEventListener('click', () => chOffice.decide('deny'));
$('bRefer').addEventListener('click', () => chOffice.decide('refer'));
$('sleepBtn').addEventListener('click', () => chOffice.leave());
$('pause').addEventListener('click', () => { A.init(); $('pause').classList.add('hidden'); S.paused = false; if (!S.uiMode) lockPointer(); });
canvas.addEventListener('mousedown', e => { if (S.chapter !== 6 || !S.running || S.paused) return; A.init(); if (!chCombat.p.alive) { chCombat.restart(); return; } if (e.button === 0) chCombat.fire(); if (e.button === 2) chCombat.throwOrPick(); });
canvas.addEventListener('contextmenu', e => { if (S.chapter === 6) e.preventDefault(); });
$('combatBtn').addEventListener('click', e => { e.stopPropagation(); startGame(6); });
$('end').addEventListener('click', () => { const c = S.startCh || 0; S.running = false; S.sanity = 1; S.endShown = false; S.fade = 1; S.fadeTarget = 1; startGame(c); });
function showEnd(txt) { S.endShown = true; $('endtxt').innerHTML = (txt || 'The dream remembers you. It will be here when you close your eyes.') + `<br><br><small>Dream session #${session.seed} (${session.names.join(', ')}) · echoes heard ${S.heard.size}/${ECHO_TOTAL} · citations ${S.citations}${S.moleHelped ? ' · you let M through' : ''}</small>`; $('end').classList.remove('hidden'); try { document.exitPointerLock(); } catch (e) { /* ignore */ } }

function useInteract() {
  const it = target; if (it) it.onUse();
}
let target = null;
function findTarget() {
  const f = fwdVec(); let best = null, bd = .9;
  for (const it of interactables) {
    if (!it.on || (it.cond && !it.cond())) continue;
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
  if (!S.input || S.seated) { f = s = 0; }
  if (S.seated) { player.yaw = clamp(player.yaw, -1.1, 1.1); }
  const len = Math.hypot(f, s) || 1; f /= len; s /= len;
  let sp = (keys.ShiftLeft || keys.ShiftRight ? 4.3 : 2.5) * (S.wading ? .72 : 1) * (S.eye > .5 ? .3 : 1) * (session.mods.heavy ? .8 : 1);
  const tx = (-Math.sin(player.yaw) * f + Math.cos(player.yaw) * s) * sp, tz = (-Math.cos(player.yaw) * f - Math.sin(player.yaw) * s) * sp;
  player.vx = lerp(player.vx, tx, clamp(dt * 12, 0, 1)); player.vz = lerp(player.vz, tz, clamp(dt * 12, 0, 1));
  player.x += player.vx * dt; player.z += player.vz * dt; resolve(player, player.r);
  const v = Math.hypot(player.vx, player.vz);
  player.bob += v * dt * 2.3; const ph = Math.sin(player.bob);
  if (v > .5 && ph < 0 && player.lastStep >= 0) { const k = S.chapter === 2 ? 'water' : S.chapter === 3 ? 'tile' : 'wood'; A.step(k); if (session.mods.echo) setTimeout(() => A.step(k), 280); }
  player.lastStep = ph;
  camera.position.set(player.x, (S.seated ? 1.25 : session.mods.child ? 1.12 : 1.62) + ph * .035 * Math.min(1, v / 2.5) - S.eye * .15, player.z);
}
function update(dt) {
  S.time += dt;
  S.spike = Math.max(0, S.spike - dt * .5); S.flash = Math.max(0, S.flash - dt * 1.6); S.tension = Math.max(0, S.tension - dt * .5);
  const combatMode = !!(currentCh && currentCh.combat);
  S.listen = lerp(S.listen, keys.KeyR && S.running && !combatMode ? 1 : 0, clamp(dt * 5, 0, 1)); S.ring = Math.max(0, S.ring - dt * .006);
  if (S.listen > .5 && S.chapter !== 5) S.sanity = Math.max(0, S.sanity - dt * .008);
  const eyeT = keys.KeyQ && S.input ? 1 : 0; S.eye = lerp(S.eye, eyeT, clamp(dt * 9, 0, 1));
  S.fade = lerp(S.fade, S.fadeTarget, clamp(dt * (S.fadeTarget ? 1.5 : 4), 0, 1));
  if (S.running) { if (!combatMode) movePlayer(dt); } else { player.yaw = Math.PI * .85 + Math.sin(S.time * .15) * .15; camera.position.set(player.x, 1.62, player.z); }
  if (currentCh) currentCh.update(dt);
  updaters.forEach(u => u(dt));
  updateGhost(dt); updateEchoes(dt);
  if (session.mods.breath && S.chapter !== 5 && !combatMode) { const b = Math.sin(S.time * .9); world.scale.set(1 + b * .012, 1 + Math.sin(S.time * .9 + 1) * .025, 1 + b * .012); } else world.scale.set(1, 1, 1);
  const insan = clamp((1 - S.sanity) * .75 + S.insanBase + S.spike, 0, 1);
  S.insan = insan;
  // camera feel
  if (!combatMode) camera.rotation.set(player.pitch, player.yaw, Math.sin(S.time * .7) * insan * .035 + (session.mods.tilt ? session.roll : 0));
  if (!combatMode) { camera.fov = (session.mods.long ? 88 : 72) + Math.sin(S.time * .5) * insan * 6 + S.spike * 6; camera.updateProjectionMatrix(); }
  torch.intensity = S.flashlightOn ? 1.7 * (insan > .4 && Math.random() < insan * .08 ? .1 : 1) : 0;
  torch.angle = .5 - insan * .12; if (session.mods.pulse) torch.intensity *= .72 + .28 * Math.sin(S.time * 5.3);
  const U = post.mat.uniforms; if (!combatMode) U.listen.value = S.listen; U.ghost.value = session.mods.double ? 1 : 0; U.hue.value = session.mods.hue ? S.time * .05 : 0;
  U.tint.value.set(...(session.mods.red ? [1.3, .72, .66] : [1, 1, 1]));
  if (session.mods.neg) { session.negT -= dt; U.invert.value = session.negT < 0 ? 1 : 0; if (session.negT < -.35) { session.negT = rnd(14, 30); } } else U.invert.value = 0;
  target = S.running && S.input ? findTarget() : null;
  const pr = $('prompt'); if (target) { pr.textContent = 'E — ' + target.label; pr.classList.add('on'); } else pr.classList.remove('on');
  const san = $('san').firstElementChild; san.style.width = (S.sanity * 100).toFixed(0) + '%'; san.style.background = S.sanity > .5 ? '#b9b3a4' : S.sanity > .25 ? '#b08a4a' : '#8a1c1c';
  post.mat.uniforms.time.value = S.time; post.mat.uniforms.insan.value = insan; post.mat.uniforms.flash.value = S.flash; post.mat.uniforms.eye.value = S.eye; post.mat.uniforms.fade.value = S.fade;
  if (S.running) A.update(dt, { listen: S.listen, ring: S.ring, insan, scrape: S.scrape * (S.running ? 1 : 0), wind: S.wind, tension: clamp(S.tension + S.spike * .5, 0, 1) });
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
window.__dream = { ch4, chOffice, chCombat, session, newSession, S, player, goChapter, startGame, watcher, camera, chapters, say, colliders };
const m = /ch=(\d)/.exec(location.hash); if (m && /debug/.test(location.search)) { S.running = true; S.startCh = +m[1]; goChapter(+m[1]); $('menu').classList.add('hidden'); }
})();
