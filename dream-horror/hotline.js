/* HOLLOW LULLABY — THE TOWER RAID: a clone of Hotline Miami's combat rules (original art, code and names).
   Real time, top-down, one hit kills everyone including you, instant restart. The rules that make that system what it is:
     · guards have VISION CONES and HEARING: gunshots alert everything within earshot, melee is nearly silent
     · blunt weapons, fists, thrown items and swinging DOORS knock enemies down; a downed enemy can be EXECUTED
     · enemies react with a delay (so a fast player can win the first move), and then they are accurate
     · points come from kills chained inside a short window (COMBO), with bonuses for style
   The "masks" are cybernetic IMPROVEMENTS that the rich of Turin buy in the Arasaka Tower (the former Intesa Sanpaolo skyscraper, in this fiction).
   Each improvement is a perk with a CYBERPSYCHOSIS cost: more power, more glitching, and episodes where the body stops obeying. */
(() => {
'use strict';
const HL = window.HL, { S, A, T, clamp, rnd, pick, lerp } = HL, $ = HL.$, PH = HL.PH, MAPS = window.HLMaps, IMPLANTS = MAPS.IMPLANTS;
const C = 1.6;   // cell size in world units

/* ───────────── styles + DOM ───────────── */
const st = document.createElement('style');
st.textContent = `
#hl,#hlSel,#hlRes{font-family:Impact,"Arial Black",sans-serif;font-style:italic;letter-spacing:.04em;color:#fff}
#hl{position:fixed;inset:0;z-index:3;pointer-events:none}
#hl.hidden,#hlSel.hidden,#hlRes.hidden{display:none}
#hlFloor{position:absolute;left:18px;top:12px;font-size:14px;color:#ffcf6a;text-shadow:0 0 8px #000}
#hlScore{position:absolute;left:18px;top:32px;font-size:clamp(26px,4vw,44px);color:#ff3aa0;text-shadow:3px 3px 0 #4ac8ff}
#hlCombo{position:absolute;left:20px;top:clamp(70px,10vw,92px);font-size:22px;color:#fff36a;text-shadow:2px 2px 0 #ff3aa0}
#hlWeapon{position:absolute;right:18px;bottom:62px;font-size:clamp(20px,3vw,32px);text-shadow:3px 3px 0 #ff3aa0}
#hlPsy{position:absolute;right:18px;bottom:28px;width:200px;font-size:11px;text-align:right;text-shadow:1px 1px 0 #000}
#hlPsy .bar{height:8px;background:#ffffff22;margin-top:3px}#hlPsy .bar i{display:block;height:100%;background:linear-gradient(90deg,#4ac8ff,#ff3aa0)}
#hlMsg{position:absolute;left:50%;top:16%;transform:translateX(-50%) skewX(-8deg);font-size:clamp(22px,4.5vw,52px);text-align:center;width:92vw;text-shadow:4px 4px 0 #ff2244,-2px -2px 0 #4ac8ff;opacity:0;transition:opacity .25s}#hlMsg.on{opacity:1}
#hlHelp{position:absolute;left:18px;bottom:12px;font-family:Georgia,serif;font-style:normal;font-size:11px;opacity:.5;line-height:1.6;max-width:62vw}
.hlpop{position:absolute;font-size:22px;color:#fff36a;text-shadow:2px 2px 0 #ff2244;animation:hlpop .9s ease-out forwards;white-space:nowrap}
@keyframes hlpop{0%{transform:translate(-50%,0) scale(.6);opacity:1}30%{transform:translate(-50%,-14px) scale(1.2)}100%{transform:translate(-50%,-48px) scale(1);opacity:0}}
#hlSel,#hlRes{position:fixed;inset:0;z-index:7;background:radial-gradient(ellipse at center,#1a0a22f4,#030106fc);display:flex;align-items:center;justify-content:center;overflow:auto;padding:14px;text-align:center}
.hbox{max-width:760px;width:100%}.hbox h2{font-weight:400;font-size:clamp(22px,4vw,40px);letter-spacing:.2em;text-transform:uppercase;margin:0 0 6px;text-shadow:3px 3px 0 #ff3aa0}
.hbox p{font-family:Georgia,serif;font-style:normal;opacity:.75;line-height:1.55;font-size:14px;margin:6px 0}
.imp{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;text-align:left;border:1px solid #ffffff33;background:#12081a;margin:6px 0;padding:8px 12px;cursor:pointer;font-family:Georgia,serif;font-style:normal}
.imp b{font-family:Impact,sans-serif;font-style:italic;letter-spacing:.06em;font-size:15px;color:#ffcf6a}.imp small{display:block;opacity:.65}
.imp.sel{border-color:#ff3aa0;background:#2a0c30}.imp.off{opacity:.35;cursor:not-allowed}
.imp em{font-style:normal;color:#ff6ac8;font-size:13px}
.hbtn{font:inherit;font-size:15px;padding:10px 22px;margin:6px;border:2px solid #ff3aa0;background:#1a0a22;color:#fff;cursor:pointer;letter-spacing:.12em;text-transform:uppercase}
.hbtn:hover{background:#ff3aa0}.hbtn.alt{border-color:#4ac8ff}.hbtn:disabled{opacity:.35}
body.hotline #dot,body.hotline #san,body.hotline #hint,body.hotline #prompt{display:none}
`;
document.head.appendChild(st);
const hud = document.createElement('div'); hud.id = 'hl'; hud.className = 'hidden';
hud.innerHTML = `<div id="hlFloor"></div><div id="hlScore"></div><div id="hlCombo"></div><div id="hlWeapon"></div><div id="hlPsy"></div><div id="hlMsg"></div>
  <div id="hlHelp">WASD move · mouse aim · LMB attack/shoot (fists, bats, doors and thrown items knock guards down: click them again to EXECUTE) · RMB or E throw / pick up · hold SPACE look ahead · Shift dash (Sandevistan) · R restart instantly · Esc pause<br>Guards hear gunshots. Doors stun whoever stands behind them. One hit kills, yours and theirs.</div>`;
document.body.appendChild(hud);
const sel = document.createElement('div'); sel.id = 'hlSel'; sel.className = 'hidden'; document.body.appendChild(sel);
const res = document.createElement('div'); res.id = 'hlRes'; res.className = 'hidden'; document.body.appendChild(res);

/* ───────────── data ───────────── */
const WEAP = {
  fists: { melee: true, range: 1.05, arc: 1.4, cd: .34, kill: false, label: 'FISTS', noise: 3 },
  knife: { melee: true, range: 1.25, arc: 1.7, cd: .26, kill: true, label: 'KNIFE', noise: 3 },
  bat: { melee: true, range: 1.75, arc: 2.1, cd: .5, kill: false, label: 'BAT', noise: 5 },
  pistol: { gun: true, ammo: 8, cd: .28, spread: .03, pellets: 1, noise: 15, label: 'PISTOL' },
  shotgun: { gun: true, ammo: 4, cd: .8, spread: .32, pellets: 6, noise: 20, label: 'SHOTGUN' },
  smg: { gun: true, ammo: 30, cd: .085, spread: .12, pellets: 1, noise: 17, label: 'SMG', auto: true },
  rifle: { gun: true, ammo: 99, cd: 2, spread: 0, pellets: 1, noise: 22, label: 'RIFLE' },
};
const KINDS = {
  g: { k: 'guard', look: 'gunner', weapon: 'pistol', speed: 2.7, cone: .95, range: 10, react: .45 },
  b: { k: 'bat', look: 'melee', weapon: 'bat', speed: 3.7, cone: 1.0, range: 9, react: .25 },
  s: { k: 'heavy', look: 'gunner', weapon: 'shotgun', speed: 2.3, cone: .9, range: 9, react: .6, tint: 0x8a4aff },
  k: { k: 'blade', look: 'melee', weapon: null, speed: 3.4, cone: 1.0, range: 11, react: .3, tint: 0xff9a2a },
  o: { k: 'sniper', look: 'gunner', weapon: 'rifle', speed: 0, cone: .45, range: 22, react: .2, tint: 0x40e0ff },
  x: { k: 'psycho', look: 'verdant', weapon: null, speed: 5.0, cone: 1.5, range: 12, react: .15, tint: 0xff3acb },
  C: { k: 'boss', look: 'gunner', weapon: 'smg', speed: 2.1, cone: 3.14, range: 22, react: .1, tint: 0xffd24a, scale: 1.35, plates: 3 },
};
function weaponMesh(type) {
  const g = new T.Group(), dk = HL.mat({ color: 0x2a2c30, emissive: 0x101010 });
  if (type === 'knife') HL.box(.04, .06, .5, 0, 0, .3, HL.mat({ color: 0xcfd6dc, emissive: 0x303438 }), false, g);
  else if (type === 'bat') { const c = HL.cyl(.05, .035, 1.2, 0, 0, .45, HL.mat({ color: 0xb08a50, emissive: 0x2a1c0c }), 6, g); c.rotation.x = Math.PI / 2; }
  else if (type === 'pistol') HL.box(.08, .12, .34, 0, 0, .14, dk, false, g);
  else if (type === 'shotgun') HL.box(.09, .1, .95, 0, 0, .4, HL.mat({ color: 0x4a3420, emissive: 0x140c06 }), false, g);
  else if (type === 'smg') HL.box(.09, .16, .5, 0, 0, .2, dk, false, g);
  else if (type === 'rifle') HL.box(.07, .08, 1.2, 0, 0, .5, dk, false, g);
  return g;
}
function tint(g, color) { g.traverse(o => { if (o.material && o.material.color) { o.material = o.material.clone(); o.material.color.lerp(new T.Color(color), .65); if (o.material.emissive) o.material.emissive.setHex(color).multiplyScalar(.22); } }); }

const chHot = {
  name: ['Torino, 2147', 'The Arasaka Tower'], combat: true,
  floor: 0, score: 0, hist: [], equipped: [], running: false,
  /* ───── lifecycle ───── */
  build() {
    S.uiMode = true; S.flashlightOn = false; try { document.exitPointerLock(); } catch (e) { /* ignore */ }
    document.body.classList.add('combat', 'hotline'); HL.scene.fog.color.set(0x07050c); HL.scene.fog.density = .01; HL.scene.background.set(0x07050c);
    HL.amb.color.set(0xc0b0d0); HL.amb.intensity = 1.0; HL.moon.intensity = .7; HL.moon.color.set(0xffffff); HL.moon.position.set(-4, 10, 6);
    this.running = false; this.F = null; hud.classList.add('hidden'); res.classList.add('hidden');
    this.openSelect();
  },
  pool() { return S.dayStarted ? (S.implants || []) : Object.keys(IMPLANTS); },
  openSelect() {
    const own = this.pool(), arcade = !S.dayStarted; if (!this.equipped.length) this.equipped = own.slice(0, 2);
    this.equipped = this.equipped.filter(k => own.includes(k));
    const base = S.psyBase || 0;
    sel.innerHTML = `<div class="hbox"><h2>The Tower raid</h2>
      <p>Torino, 2147. The rich of the Light Side do not grow old: they get <b>Improvements</b>. Cybernetic upgrades, sold on the upper floors of the <b>Arasaka Tower</b>, the old Intesa Sanpaolo skyscraper. Every upgrade is a little less of the person who bought it. The security staff are the ones who bought too many.</p>
      <p>${arcade ? 'Arcade mode: every improvement is available.' : 'Only the improvements you had installed at the Poors ripperdoc are available.'} Choose up to <b>two</b>. Each adds <b>cyberpsychosis</b>.</p>
      <div id="hlImps">${Object.entries(IMPLANTS).map(([k, v]) => `<div class="imp ${own.includes(k) ? '' : 'off'}" data-k="${k}"><div><b>${v.name}</b><small>${v.desc}</small></div><em>+${v.psy}% psychosis</em></div>`).join('')}</div>
      <p id="hlPsyLine"></p>
      <div><button class="hbtn" id="hlGo">Ride the lift</button><button class="hbtn alt" id="hlBack">Back</button></div></div>`;
    const refresh = () => { sel.querySelectorAll('.imp').forEach(el => el.classList.toggle('sel', this.equipped.includes(el.dataset.k))); const tot = base + this.equipped.reduce((a, k) => a + IMPLANTS[k].psy, 0); $('hlPsyLine').innerHTML = `Starting cyberpsychosis: <b>${tot}%</b>${base ? ` (includes ${base}% from your own implants)` : ''}. Above 40% the world glitches; above 70% your body has episodes and stops obeying; above 100% you are no longer driving. Score is multiplied by <b>×${(1 + tot / 200).toFixed(2)}</b>.`; };
    sel.querySelectorAll('.imp').forEach(el => el.onclick = () => { const k = el.dataset.k; if (!own.includes(k)) return; const i = this.equipped.indexOf(k); if (i >= 0) this.equipped.splice(i, 1); else { if (this.equipped.length >= 2) this.equipped.shift(); this.equipped.push(k); } A.burst(1800, 3, .04, .1); refresh(); });
    $('hlGo').onclick = () => { A.init(); sel.classList.add('hidden'); this.begin(); }; $('hlBack').onclick = () => { sel.classList.add('hidden'); if (S.dayStarted && HL.idx.day != null) HL.goChapter(HL.idx.day); else location.reload(); };
    refresh(); sel.classList.remove('hidden');
  },
  begin() {
    this.score = 0; this.floor = 0; this.stats = { kills: 0, exec: 0, doors: 0, deaths: 0, time: 0, floors: 0 }; this.running = true; this.t0 = performance.now(); hud.classList.remove('hidden'); res.classList.add('hidden');
    this.loadFloor(0);
  },
  /* ───── floor construction ───── */
  loadFloor(n) {
    HL.clearWorld(); this.floor = n; const F = MAPS.FLOORS[n], rows = F.map, H = rows.length, W = rows[0].length, rng = HL.mulberry(HL.session.seed * 131 + n * 17);
    const P = (c, r) => ({ x: (c - (W - 1) / 2) * C, z: (r - (H - 1) / 2) * C });
    const f = this.F = { n, def: F, W, H, P, enemies: [], doors: [], pickups: [], bullets: [], thrown: [], fx: [], decals: [], cleared: false, t: 0, startScore: this.score, shield: 0, elevator: null, noises: [], kills: 0, grid: rows.map(r => [...r]) };
    HL.scene.fog.density = .008;
    const tex = HL.mkCanvas(128, 128, (g, w, h) => { g.fillStyle = F.pal.a; g.fillRect(0, 0, w, h); g.fillStyle = F.pal.b; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); g.strokeStyle = F.pal.line; g.globalAlpha = .28; g.strokeRect(.5, .5, 127, 127); g.globalAlpha = .1; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(rnd(0, w), rnd(0, h)); g.bezierCurveTo(rnd(0, w), rnd(0, h), rnd(0, w), rnd(0, h), rnd(0, w), rnd(0, h)); g.stroke(); } g.globalAlpha = 1; HL.noise(g, w, h, 10); });
    HL.slab(W * C, H * C, 0, 0, 0, tex, C * 2);
    const wallM = HL.mat({ color: F.pal.wall, emissive: 0x08040a }), cap = new T.MeshBasicMaterial({ color: new T.Color(F.pal.glow).multiplyScalar(.5) }), deskM = HL.mat({ color: 0x3a2a24, emissive: 0x0a0604 });
    rows.forEach((row, r) => { let c = 0; while (c < W) { if (row[c] === '#') { let e = c; while (e < W && row[e] === '#') e++; const a = P(c, r), b = P(e - 1, r), cx = (a.x + b.x) / 2, len = (e - c) * C; HL.wallBox(len, 1.5, C, cx, a.z, wallM); HL.box(len, .04, C, cx, 1.52, a.z, cap, false); c = e; } else c++; } });
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const q = P(c, r);
      if (ch === 'D') { HL.box(C * .92, .75, C * .92, q.x, .38, q.z, deskM, true); HL.box(C * .92, .03, C * .92, q.x, .77, q.z, cap, false); }
      if (ch === 'P') f.spawn = q;
      if (ch === 'X') { f.elevator = q; f.pad = HL.cyl(.7, .7, .05, q.x, .03, q.z, new T.MeshBasicMaterial({ color: 0x333333 }), 20); f.light = HL.pointLight(F.pal.glow, 0, 6, q.x, 1.2, q.z); }
      if (ch === 'w') this.addPickup(q.x, q.z, pick(F.pool), rng);
      if (ch === 'd') this.addDoor(c, r, q, rows);
      if (KINDS[ch]) this.addEnemy(ch, q.x, q.z, rng);
    }));
    f.halo = HL.pointLight(0x8fe8ff, .9, 7, 0, 2.2, 0); f.muzzle = HL.pointLight(0xffd080, 0, 8, 0, 1.4, 0);
    this.makePlayer(f.spawn); this.bulletGeo = this.bulletGeo || (() => { const g = new T.CylinderGeometry(.05, .05, .5, 5); g.rotateX(Math.PI / 2); return g; })();
    this.combo = 0; this.comboT = 0; this.beatT = 0; this.beatI = 0; this.msgT = 0; this.episode = 0; this.episodeT = rnd(6, 10); this.ghost = null;
    this.psyBase = (S.psyBase || 0) + this.equipped.reduce((a, k) => a + IMPLANTS[k].psy, 0); f.shield = this.has('subdermal') ? 1 : 0;
    this.msg(F.name.toUpperCase(), 2600); const sub = F.sub; HL.later(300, () => HL.say(sub, 3500));
    HL.camera.position.set(this.p.x, 13, this.p.z + 7.5);
  },
  has(k) { return this.equipped.includes(k); },
  makePlayer(q) {
    const g = HL.makeFighter('player'); HL.world.add(g);
    this.p = { x: q.x, z: q.z, vx: 0, vz: 0, ang: 0, r: .32, alive: true, weapon: null, cd: 0, swing: 0, g, dashT: 0, dashCd: 0, inv: 0, glitch: 0 };
  },
  addPickup(x, z, type, rng, ammo) {
    const g = weaponMesh(type); g.position.set(x, .2, z); HL.world.add(g);
    const ring = new T.Mesh(new T.RingGeometry(.35, .42, 20), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .03, z); HL.world.add(ring);
    this.F.pickups.push({ g, ring, type, x, z, ammo: ammo != null ? ammo : (WEAP[type].ammo || 0) });
  },
  addDoor(c, r, q, rows) {
    const vertical = rows[r - 1][c] === '#' && rows[r + 1][c] === '#';   // set in a vertical wall: it blocks passage along x
    const w = C, piv = new T.Group(); HL.world.add(piv);
    const m = new T.Mesh(new T.BoxGeometry(vertical ? .14 : w, 1.3, vertical ? w : .14), HL.mat({ color: 0xb48a3a, emissive: 0x2a1c08 })); piv.add(m);
    if (vertical) { piv.position.set(q.x, 0, q.z - w / 2); m.position.set(0, .65, w / 2); } else { piv.position.set(q.x - w / 2, 0, q.z); m.position.set(w / 2, .65, 0); }
    const col = { x0: q.x - (vertical ? .08 : w / 2), x1: q.x + (vertical ? .08 : w / 2), z0: q.z - (vertical ? w / 2 : .08), z1: q.z + (vertical ? w / 2 : .08), on: true };
    HL.colliders.push(col); this.F.doors.push({ x: q.x, z: q.z, vertical, piv, col, open: false, ang: 0, target: 0 });
  },
  addEnemy(ch, x, z, rng) {
    const k = KINDS[ch], g = HL.makeFighter(k.look); if (k.tint) tint(g, k.tint); if (k.scale) g.scale.setScalar(k.scale);
    if (k.weapon) g.userData.hand.add(weaponMesh(k.weapon)); HL.world.add(g);
    const e = { ch, k: k.k, def: k, g, x, z, r: .34 * (k.scale || 1), ang: rng() * 6.28, state: 'idle', t: 0, react: 0, cd: rng(), weapon: k.weapon, down: 0, alive: true, tx: x, tz: z, path: null, pathT: 0, plates: k.plates || 0, inv: 0, aim: 0, lunge: 0, tele: 0, bob: rng() * 6, zig: 0, flash: 0 };
    if (this.has('optic') || true) { const half = Math.min(k.cone, 1.4), cone = new T.Mesh(new T.CircleGeometry(k.range, 20, -Math.PI / 2 - half, half * 2), new T.MeshBasicMaterial({ color: k.k === 'sniper' ? 0x40e0ff : 0xff3a4a, transparent: true, opacity: .13, side: T.DoubleSide, depthWrite: false })); cone.rotation.x = -Math.PI / 2; cone.position.y = .06; cone.visible = false; g.add(cone); e.cone = cone; }
    g.position.set(x, 0, z); g.rotation.y = e.ang; this.F.enemies.push(e);
  },
  /* ───── helpers ───── */
  msg(t, ms) { const el = $('hlMsg'); el.textContent = t; el.classList.add('on'); clearTimeout(this.mt); if (ms) this.mt = setTimeout(() => el.classList.remove('on'), ms); },
  screen(x, z) { const v = new T.Vector3(x, 1.4, z).project(HL.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
  popup(text, x, z, color) { const [sx, sy] = this.screen(x, z), el = document.createElement('div'); el.className = 'hlpop'; el.textContent = text; el.style.left = sx + 'px'; el.style.top = sy + 'px'; if (color) el.style.color = color; hud.appendChild(el); setTimeout(() => el.remove(), 950); },
  solid(c) { return c.on && !c.low; },
  blocked(x0, z0, x1, z1) { for (const c of HL.colliders) if (c.on && !c.noLos && PH.segmentBox(x0, z0, x1, z1, c)) return true; return false; },
  cell(x, z) { const f = this.F; return { c: clamp(Math.round(x / C + (f.W - 1) / 2), 0, f.W - 1), r: clamp(Math.round(z / C + (f.H - 1) / 2), 0, f.H - 1) }; },
  center(c, r) { return this.F.P(c, r); },
  /* breadth-first path over the tower grid (doors are passable, walls and desks are not) */
  path(x0, z0, x1, z1) {
    const f = this.F, a = this.cell(x0, z0), b = this.cell(x1, z1), key = (c, r) => r * f.W + c, prev = new Map([[key(a.c, a.r), -1]]), q = [[a.c, a.r]];
    for (let i = 0; i < q.length; i++) { const [c, r] = q[i]; if (c === b.c && r === b.r) break; for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= f.W || nr >= f.H) continue; const ch = f.grid[nr][nc]; if (ch === '#' || ch === 'D' || prev.has(key(nc, nr))) continue; prev.set(key(nc, nr), key(c, r)); q.push([nc, nr]); } }
    if (!prev.has(key(b.c, b.r))) return null; const out = []; let k = key(b.c, b.r); while (k !== -1) { out.push(k); k = prev.get(k); } out.reverse().shift();
    return out.map(k => this.center(k % f.W, (k / f.W) | 0));
  },
  /* ───── noise: gunshots alert everything in earshot ───── */
  noise(x, z, radius) {
    this.F.enemies.forEach(e => { if (!e.alive || e.down > 0 || e.state !== 'idle') return; if (Math.hypot(e.x - x, e.z - z) < radius) { e.state = 'investigate'; e.react = e.def.react * this.reactMul(); e.tx = x; e.tz = z; e.path = this.path(e.x, e.z, x, z); } });
  },
  reactMul() { return this.has('reflex') ? 1.5 : 1; },
  canSee(e, tx, tz) {
    const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz); if (d > e.def.range) return false;
    let da = Math.atan2(dx, dz) - e.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > e.def.cone) return false;
    return !this.blocked(e.x, e.z, tx, tz);
  },
  /* ───── scoring ───── */
  mult() { return 1 + this.psy() / 200; },
  psy() { return Math.min(130, this.psyBase + this.F.kills * 1.5); },
  award(base, label, x, z) {
    this.combo = this.comboT > 0 ? Math.min(this.combo + 1, 9) : 1; this.comboT = 2.6; const pts = Math.round(base * this.combo * this.mult());
    this.score += pts; this.popup(`${label ? label + ' ' : ''}+${pts}`, x, z, this.combo > 3 ? '#ff7ad8' : '#fff36a'); if (this.combo >= 3) this.msg(`${this.combo}× COMBO`, 700);
  },
  /* ───── enemy damage states ───── */
  kill(e, how, dir) {
    if (!e.alive) return; if (e.k === 'boss') { if (e.inv > 0) return; e.plates--; e.inv = .9; e.flash = .9; A.sting(.4); HL.S.flash = .25; this.puff(e.x, e.z, 0xffd24a, 10); this.popup(e.plates ? 'ARMOUR BROKEN' : 'CHAIRMAN DOWN', e.x, e.z, '#ffd24a'); if (e.plates > 0) return; }
    e.alive = false; HL.world.remove(e.g); this.F.kills++; this.stats.kills++; if (how === 'exec') this.stats.exec++;
    const base = { gun: 100, melee: 120, exec: 160, door: 130, thrown: 110 }[how] || 100, label = { exec: 'EXECUTION', door: 'DOOR', thrown: 'THROWN' }[how] || '';
    this.award(base, label, e.x, e.z); this.gore(e, dir || 0); if (e.weapon && e.weapon !== 'rifle' && !e.dropped) { e.dropped = true; this.addPickup(e.x, e.z, e.weapon, null, e.weapon === 'pistol' ? 4 : null); }
    A.burst(3200, .5, .3, .3); [1800, 2600, 3500].forEach((f, i) => A.tone(f * rnd(.9, 1.1), .22, .035, 'triangle', i * .03)); A.thump(.5); HL.S.shake = Math.max(HL.S.shake || 0, .2);
    if (this.F.enemies.every(x => !x.alive)) { this.F.cleared = true; this.msg('FLOOR CLEAR: GET TO THE LIFT', 3000); A.chime(); }
  },
  down(e, secs, how) {
    if (!e.alive) return; if (e.k === 'boss') { this.kill(e, how || 'melee'); return; } if (e.down > 0) { e.down = Math.max(e.down, secs); return; }
    e.down = secs; e.state = 'down'; e.lunge = 0; e.tele = 0; e.g.rotation.x = -Math.PI / 2; e.g.position.y = .25; if (e.cone) e.cone.visible = false; this.puff(e.x, e.z, 0xffffff, 4); A.burst(500, 1, .2, .3);
  },
  gore(e, dir) {
    const col = e.k === 'psycho' ? 0xff3acb : e.k === 'boss' ? 0xffd24a : 0xc01028, sm = new T.MeshLambertMaterial({ color: col, emissive: 0x300008, flatShading: true, transparent: true, opacity: 1 });
    for (let i = 0; i < 16; i++) { const sh = new T.Mesh(new T.TetrahedronGeometry(rnd(.06, .16)), sm); sh.position.set(e.x + rnd(-.2, .2), rnd(.4, 1.6), e.z + rnd(-.2, .2)); HL.world.add(sh); const a = dir + rnd(-1, 1), sp = rnd(2, 7); this.F.fx.push({ m: sh, mat: sm, vx: Math.sin(a) * sp, vy: rnd(1, 5), vz: Math.cos(a) * sp, rx: rnd(-9, 9), life: 1.5 }); }
    const dec = new T.Mesh(new T.CircleGeometry(rnd(.5, .95), 12), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: .75 })); dec.rotation.x = -Math.PI / 2; dec.position.set(e.x + Math.sin(dir) * .4, .02, e.z + Math.cos(dir) * .4); dec.scale.set(1, rnd(.6, 1.6), 1); HL.world.add(dec);
  },
  puff(x, z, color, n) { for (let i = 0; i < n; i++) { const sm = new T.MeshBasicMaterial({ color, transparent: true }), m = new T.Mesh(new T.TetrahedronGeometry(.07), sm); m.position.set(x, 1.1, z); HL.world.add(m); const a = rnd(0, 6.28); this.F.fx.push({ m, mat: sm, vx: Math.sin(a) * 3, vy: rnd(0, 2), vz: Math.cos(a) * 3, rx: 5, life: .4 }); } },
  /* ───── player actions ───── */
  hurt(cause) {
    const p = this.p; if (!p.alive || p.inv > 0) return;
    if (this.F.shield > 0) { this.F.shield--; p.inv = 1; this.msg('PLATING ABSORBED IT', 1100); A.sting(.4); HL.S.flash = .35; this.puff(p.x, p.z, 0x4ac8ff, 12); return; }
    p.alive = false; this.stats.deaths++; HL.S.flash = .7; A.sting(.9); p.g.rotation.x = -Math.PI / 2; p.g.position.y = .25; this.gore({ x: p.x, z: p.z, k: 'player' }, 0);
    this.msg('YOU DIED. R or CLICK: AGAIN', 0);
  },
  weaponDef() { const w = this.p.weapon ? WEAP[this.p.weapon.type] : WEAP.fists; if (!this.p.weapon && this.has('mantis')) return Object.assign({}, w, { range: w.range * 1.5, kill: true, label: 'MANTIS BLADES' }); return Object.assign({}, w, w.melee && this.has('mantis') ? { range: w.range * 1.5 } : {}); },
  attack() {
    const p = this.p; if (!p.alive || p.cd > 0 || S.paused) return; const w = this.weaponDef();
    if (w.melee) {
      p.cd = w.cd; p.swing = .22; A.burst(700, 1, .12, .25); this.noise(p.x, p.z, w.noise);
      // a downed guard in reach is always executed first
      const targets = this.F.enemies.filter(e => e.alive && Math.hypot(e.x - p.x, e.z - p.z) < w.range + .35).map(e => { const dx = e.x - p.x, dz = e.z - p.z; let da = Math.atan2(dx, dz) - p.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); return { e, da: Math.abs(da), dir: Math.atan2(dx, dz) }; }).filter(t => (t.da < w.arc / 2 || Math.hypot(t.e.x - p.x, t.e.z - p.z) < .8) && !this.blocked(p.x, p.z, t.e.x, t.e.z));
      targets.sort((a, b) => (b.e.down > 0) - (a.e.down > 0) || a.da - b.da);
      targets.forEach(t => { const e = t.e; if (!e.alive) return; if (e.down > 0) this.kill(e, 'exec', t.dir); else if (w.kill) this.kill(e, 'melee', t.dir); else this.down(e, 3, 'melee'); });
      if (this.p.weapon && this.p.weapon.type === 'bat' && targets.length) this.msg('', 0);
    } else {
      if (p.weapon.ammo <= 0) { A.tone(1800, .05, .05, 'square'); p.cd = .2; this.msg('EMPTY: RIGHT CLICK TO THROW IT', 1200); return; }
      p.weapon.ammo--; p.cd = w.cd; this.noise(p.x, p.z, w.noise);
      for (let i = 0; i < w.pellets; i++) this.shoot(p.x + Math.sin(p.ang) * .7, p.z + Math.cos(p.ang) * .7, p.ang + (Math.random() - .5) * w.spread, 24, 'p');
      this.F.muzzle.position.set(p.x + Math.sin(p.ang) * .9, 1.4, p.z + Math.cos(p.ang) * .9); this.F.muzzle.intensity = 3; A.burst(1400, .7, .18, .5); A.thump(.4); HL.S.shake = Math.max(HL.S.shake || 0, .14);
    }
  },
  shoot(x, z, ang, speed, owner, color) {
    const m = new T.Mesh(this.bulletGeo, new T.MeshBasicMaterial({ color: color || (owner === 'p' ? 0x8fe8ff : 0xff7a3a) })); m.position.set(x, 1.3, z); m.rotation.y = ang; HL.world.add(m);
    this.F.bullets.push({ m, x, z, vx: Math.sin(ang) * speed, vz: Math.cos(ang) * speed, owner, life: 3 });
  },
  throwOrPick() {
    const p = this.p, f = this.F; if (!p.alive) return;
    if (p.weapon) { const m = weaponMesh(p.weapon.type); m.position.set(p.x, 1.2, p.z); HL.world.add(m); f.thrown.push({ m, x: p.x + Math.sin(p.ang) * .5, z: p.z + Math.cos(p.ang) * .5, vx: Math.sin(p.ang) * 17, vz: Math.cos(p.ang) * 17, type: p.weapon.type, ammo: p.weapon.ammo, life: 1.1 }); p.weapon = null; this.setHeld(null); A.burst(500, 1, .2, .2); return; }
    let best = null, bd = 1.5; f.pickups.forEach(k => { const d = Math.hypot(k.x - p.x, k.z - p.z); if (d < bd) { bd = d; best = k; } });
    if (best) { p.weapon = { type: best.type, ammo: best.ammo }; this.setHeld(best.type); HL.world.remove(best.g); HL.world.remove(best.ring); f.pickups.splice(f.pickups.indexOf(best), 1); A.tone(900, .08, .06, 'square'); }
  },
  setHeld(type) { const h = this.p.g.userData.hand; while (h.children.length) h.remove(h.children[0]); if (type) h.add(weaponMesh(type)); },
  restart() { this.score = this.F.startScore; this.loadFloor(this.floor); },
  /* ───── doors ───── */
  openDoor(d, fromX, fromZ, who) {
    if (d.open) return; d.open = true; d.col.on = false; const sgn = d.vertical ? (fromX < d.x ? 1 : -1) : (fromZ < d.z ? -1 : 1); d.target = sgn * Math.PI / 2; A.creak(.5, .05); A.burst(300, 1, .15, .3);
    this.F.enemies.forEach(e => { if (!e.alive || e.down > 0) return; const dx = e.x - d.x, dz = e.z - d.z, side = d.vertical ? Math.sign(dx) * (fromX < d.x ? 1 : -1) : Math.sign(dz) * (fromZ < d.z ? 1 : -1); if (Math.hypot(dx, dz) < 1.7 && side > 0) { this.down(e, 3, 'door'); if (who === 'p') { this.stats.doors++; this.award(30, 'DOOR', e.x, e.z); } } });
  },
  /* ───── per-step update ───── */
  update(dt) {
    S.sanity = 1; S.scrape = 0; S.wind = .015; const f = this.F; if (!f || !this.running) { return; }
    const p = this.p; f.t += dt; this.comboT -= dt; if (this.comboT <= 0) this.combo = 0;
    const psy = this.psy(); S.insanBase = clamp(psy / 230, 0, .6); S.hueExtra = Math.sin(S.time * .9) * (.15 + psy / 260);
    this.playerStep(dt, psy); this.doorsStep(dt); f.enemies.forEach(e => this.enemyStep(e, dt)); this.bulletsStep(dt); this.thrownStep(dt); this.fxStep(dt);
    f.pickups.forEach(k => { k.g.rotation.y += dt * 1.5; k.ring.material.opacity = .3 + Math.sin(f.t * 4) * .2; });
    const opt = this.has('optic'); f.enemies.forEach(e => { if (e.cone) e.cone.visible = opt && e.alive && e.down <= 0 && e.k !== 'psycho'; });
    f.halo.position.set(p.x, 2.2, p.z); f.muzzle.intensity = Math.max(0, f.muzzle.intensity - dt * 40);
    if (f.pad) { f.pad.material.color.set(f.cleared ? (Math.sin(f.t * 8) > 0 ? f.def.pal.glow : 0xffffff) : 0x333333); f.light.intensity = f.cleared ? 2 : 0; if (f.cleared && p.alive && Math.hypot(p.x - f.elevator.x, p.z - f.elevator.z) < .9) this.finishFloor(); }
    this.beatT -= dt; if (this.beatT <= 0) { this.beatT = 60 / 124 / 2; const i = this.beatI++, b = [55, 55, 65.4, 55, 73.4, 55, 82.4, 73.4][i % 8] * (1 + psy / 400); if (i % 2 === 0) A.thump(.3); A.tone(b, .2, .05, 'sawtooth'); if (i % 2) A.burst(8000, .7, .03, .05); }
    this.cameraStep(dt); this.hudStep(psy);
  },
  playerStep(dt, psy) {
    const p = this.p, K = HL.keys; if (!p.alive) return;
    p.cd = Math.max(0, p.cd - dt); p.swing = Math.max(0, p.swing - dt); p.inv = Math.max(0, p.inv - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.glitch = Math.max(0, p.glitch - dt);
    // cyberpsychosis episodes: above 70% the body stops obeying for a moment
    if (psy >= 70) { this.episodeT -= dt; if (this.episodeT <= 0) { this.episodeT = psy >= 100 ? rnd(3.5, 6) : rnd(9, 14); p.glitch = 1.1; this.msg('CYBERPSYCHOSIS EPISODE', 900); A.whisperBurst(.15); HL.S.spike = .5; this.spawnGhost(); } }
    let mx = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0), mz = (K.KeyS ? 1 : 0) - (K.KeyW ? 1 : 0); if (p.glitch > 0) { mx = -mx; mz = -mz; }
    const l = Math.hypot(mx, mz) || 1, sp = 5.3 * (p.dashT > 0 ? 3.4 : 1);
    if (this.has('dash') && (K.ShiftLeft || K.ShiftRight) && p.dashCd <= 0 && (mx || mz)) { p.dashT = .18; p.dashCd = 2; p.inv = Math.max(p.inv, .22); A.burst(1200, 1, .2, .25); this.puff(p.x, p.z, 0x4ac8ff, 8); }
    p.dashT = Math.max(0, (p.dashT || 0) - dt);
    p.vx = PH.relax(p.vx, mx / l * sp * (mx || mz ? 1 : 0), p.dashT > 0 ? 40 : 16, dt); p.vz = PH.relax(p.vz, mz / l * sp * (mx || mz ? 1 : 0), p.dashT > 0 ? 40 : 16, dt);
    PH.moveCircle(p, p.vx * dt, p.vz * dt, p.r, HL.colliders);
    const rc = new T.Raycaster(); rc.setFromCamera(HL.mouseNDC, HL.camera); const hit = new T.Vector3(); if (rc.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -1.2), hit)) this.aim = hit; if (this.aim) p.ang = Math.atan2(this.aim.x - p.x, this.aim.z - p.z) + (p.glitch > 0 ? Math.PI * .5 * Math.sin(this.F.t * 30) : 0);
    if (this.mouseDown && this.weaponDef().auto) this.attack();
    p.g.position.set(p.x, Math.abs(Math.sin(this.F.t * 12)) * .05 * Math.min(1, Math.hypot(p.vx, p.vz) / 5), p.z); p.g.rotation.y = p.ang; p.g.rotation.x = 0;
    p.g.userData.arm.rotation.y = p.swing > 0 ? Math.sin((1 - p.swing / .22) * Math.PI) * -1.4 + .7 : 0;
    // walking into a closed door opens it
    this.F.doors.forEach(d => { if (!d.open && Math.hypot(p.x - d.x, p.z - d.z) < C * .5 + p.r + .12 && (Math.abs(p.vx) + Math.abs(p.vz)) > .6) this.openDoor(d, p.x, p.z, 'p'); });
    // pick-ups are explicit (RMB / E); ghosts fade by themselves
    if (this.ghost) { this.ghost.t -= dt; this.ghost.g.rotation.y = Math.atan2(p.x - this.ghost.g.position.x, p.z - this.ghost.g.position.z); if (this.ghost.t <= 0) { HL.world.remove(this.ghost.g); this.ghost = null; } }
  },
  spawnGhost() { if (this.ghost) return; const g = HL.makeFighter('melee'); g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .45; } }); const a = rnd(0, 6.28), d = rnd(4, 7); g.position.set(this.p.x + Math.sin(a) * d, 0, this.p.z + Math.cos(a) * d); HL.world.add(g); this.ghost = { g, t: 1.6 }; },
  doorsStep(dt) { this.F.doors.forEach(d => { d.ang += clamp(d.target - d.ang, -6 * dt, 6 * dt); d.piv.rotation.y = d.ang; }); },
  enemyStep(e, dt) {
    if (!e.alive) return; const f = this.F, p = this.p, def = e.def, rm = this.reactMul();
    e.inv = Math.max(0, e.inv - dt); e.flash = Math.max(0, e.flash - dt); e.cd -= dt; e.bob += dt * 8;
    if (e.down > 0) { e.down -= dt; if (e.down <= 0) { e.g.rotation.x = 0; e.g.position.y = 0; e.state = 'investigate'; e.tx = p.x; e.tz = p.z; e.react = .3; } else return; }
    const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1, sees = p.alive && this.canSee(e, p.x, p.z);
    const face = (a, rate) => { let da = a - e.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); e.ang += clamp(da, -rate * dt, rate * dt); };
    const goTo = (tx, tz, speed) => {   // follow the breadth-first path, or walk straight when the way is clear
      let gx = tx, gz = tz; e.pathT -= dt;
      if (this.blocked(e.x, e.z, tx, tz) || Math.hypot(tx - e.x, tz - e.z) > 7) { if (!e.path || e.pathT <= 0) { e.path = this.path(e.x, e.z, tx, tz); e.pathT = .5; } if (e.path && e.path.length) { while (e.path.length > 1 && Math.hypot(e.path[0].x - e.x, e.path[0].z - e.z) < .35) e.path.shift(); gx = e.path[0].x; gz = e.path[0].z; } }
      const ddx = gx - e.x, ddz = gz - e.z, dd = Math.hypot(ddx, ddz); if (dd < .05) return; face(Math.atan2(ddx, ddz), 9);
      PH.moveCircle(e, ddx / dd * speed * dt, ddz / dd * speed * dt, e.r, HL.colliders);
      f.doors.forEach(dr => { if (!dr.open && Math.hypot(e.x - dr.x, e.z - dr.z) < C * .5 + e.r + .15) this.openDoor(dr, e.x, e.z, 'e'); });
    };
    if (e.state === 'idle') {
      if (def.speed > 0 || e.k === 'sniper') face(e.ang + Math.sin(f.t * .6 + e.bob) * .5, 1);
      if (sees) { e.state = 'alert'; e.react = def.react * rm; A.tone(e.k === 'psycho' ? 300 : 520, .12, .05, 'square'); }
    } else if (e.state === 'investigate') {
      e.react -= dt; if (e.react > 0) { face(Math.atan2(e.tx - e.x, e.tz - e.z), 6); } else { goTo(e.tx, e.tz, def.speed * .9); if (Math.hypot(e.tx - e.x, e.tz - e.z) < .6) { e.t += dt; if (e.t > 2) { e.state = 'idle'; e.t = 0; } } }
      if (sees) { e.state = 'alert'; e.react = def.react * rm; }
    } else if (e.state === 'alert') {
      e.react -= dt; face(Math.atan2(dx, dz), 9); if (e.react <= 0) e.state = 'attack';
    } else if (e.state === 'attack') {
      if (sees) { e.tx = p.x; e.tz = p.z; e.lost = 0; } else { e.lost = (e.lost || 0) + dt; if (e.lost > 5) { e.state = 'investigate'; e.react = .2; e.t = 0; } }
      const lastD = Math.hypot(e.tx - e.x, e.tz - e.z);
      if (e.k === 'guard' || e.k === 'heavy') {
        face(Math.atan2(e.tz - e.z, 1e-9) * 0 + Math.atan2(e.tx - e.x, e.tz - e.z), 8);
        if (sees && e.cd <= 0) { const sg = e.weapon === 'shotgun', ang = Math.atan2(dx, dz); let da = ang - e.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < .22) { for (let i = 0; i < (sg ? 5 : 1); i++) this.shoot(e.x + Math.sin(e.ang) * .7, e.z + Math.cos(e.ang) * .7, e.ang + (Math.random() - .5) * (sg ? .38 : .07), 13, 'e'); e.cd = (sg ? 1.8 : 1.0) * (0.9 + Math.random() * .3); this.noise(e.x, e.z, 14); A.burst(1100, .7, .15, .25); } }
        if (!sees || d > 9) goTo(e.tx, e.tz, def.speed); else if (d < 4.5) PH.moveCircle(e, -dx / d * def.speed * .5 * dt, -dz / d * def.speed * .5 * dt, e.r, HL.colliders);
      } else if (e.k === 'bat' || e.k === 'psycho') {
        let tx = e.tx, tz = e.tz; if (e.k === 'psycho') { e.zig -= dt; if (e.zig <= 0) { e.zig = rnd(.5, 1.1); e.zs = rnd(-1.6, 1.6); } const a = Math.atan2(dx, dz) + (sees ? e.zs : 0); if (sees && d > 2) { tx = e.x + Math.sin(a) * 3; tz = e.z + Math.cos(a) * 3; } }
        if (d < 1.0 && sees) { e.windup = (e.windup || 0) + dt; face(Math.atan2(dx, dz), 12); if (e.windup > (e.k === 'psycho' ? .18 : .3) * rm) { this.hurt('melee'); e.windup = 0; } } else { e.windup = Math.max(0, (e.windup || 0) - dt); goTo(tx, tz, def.speed); }
        e.g.userData.arm.rotation.x = (e.windup || 0) > 0 ? -(e.windup) * 4 : 0;
      } else if (e.k === 'blade') {
        if (e.lunge > 0) { e.lunge -= dt; const sp = 17; PH.moveCircle(e, Math.sin(e.ang) * sp * dt, Math.cos(e.ang) * sp * dt, e.r, HL.colliders); if (p.alive && Math.hypot(p.x - e.x, p.z - e.z) < .85) this.hurt('blade'); if (e.lunge <= 0) { this.down(e, 1.4, 'melee'); e.tele = 0; } }
        else if (e.tele > 0) { e.tele -= dt; face(Math.atan2(dx, dz), 3); if (e.tele <= 0) { e.lunge = .5; A.burst(900, 1, .3, .4); } }
        else if (sees && d > 2.5 && d < 9 && e.cd <= 0) { e.tele = .55 * rm; e.cd = 2.5; A.tone(1500, .4, .05, 'sawtooth'); }
        else { goTo(e.tx, e.tz, def.speed); if (d < 1.0 && sees) { e.windup = (e.windup || 0) + dt; if (e.windup > .25 * rm) { this.hurt('blade'); e.windup = 0; } } }
      } else if (e.k === 'sniper') {
        face(Math.atan2(dx, dz), 3); if (sees) { e.aim += dt; if (e.aim >= 1.15 * rm && e.cd <= 0) { this.shoot(e.x + Math.sin(e.ang) * .8, e.z + Math.cos(e.ang) * .8, e.ang, 30, 'e', 0x40e0ff); e.cd = 2.4; e.aim = 0; this.noise(e.x, e.z, 22); A.burst(1800, .6, .2, .4); } } else e.aim = Math.max(0, e.aim - dt * 2);
      } else if (e.k === 'boss') {
        face(Math.atan2(dx, dz), 4); if (e.cd <= 0 && sees) { const n = e.plates === 3 ? 5 : e.plates === 2 ? 7 : 9; for (let i = 0; i < n; i++) this.shoot(e.x + Math.sin(e.ang) * .9, e.z + Math.cos(e.ang) * .9, e.ang + (i - (n - 1) / 2) * .17, 11, 'e', 0xffd24a); e.cd = 1.5 - (3 - e.plates) * .25; this.noise(e.x, e.z, 22); A.burst(900, .7, .25, .3); }
        const strafe = Math.sin(f.t * .8) * 1.4, perp = [dz / d, -dx / d]; PH.moveCircle(e, (dx / d * (d > 8 ? 1 : d < 5 ? -1 : 0) + perp[0] * strafe) * def.speed * dt, (dz / d * (d > 8 ? 1 : d < 5 ? -1 : 0) + perp[1] * strafe) * def.speed * dt, e.r, HL.colliders);
      }
    }
    e.g.position.set(e.x, Math.abs(Math.sin(e.bob)) * .05 * (e.state === 'attack' ? 1 : 0), e.z); e.g.rotation.y = e.ang;
    if (e.k === 'boss' && e.flash > 0) e.g.visible = Math.floor(f.t * 20) % 2 === 0; else e.g.visible = true;
    if (e.k === 'blade' && e.tele > 0) { /* telegraph handled by colour */ }
  },
  bulletsStep(dt) {
    const f = this.F, p = this.p;
    for (let i = f.bullets.length - 1; i >= 0; i--) {
      const b = f.bullets[i], ox = b.x, oz = b.z; b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt; b.m.position.set(b.x, 1.3, b.z); let dead = b.life <= 0;
      if (!dead) for (const c of HL.colliders) if (c.on && !c.low && PH.segmentBox(ox, oz, b.x, b.z, c)) { dead = true; this.puff(ox, oz, 0xffd080, 3); break; }
      if (!dead && b.owner === 'p') for (const e of f.enemies) if (e.alive && e.down <= 0 && PH.segmentCircle(ox, oz, b.x, b.z, e.x, e.z, e.r + .1)) { this.kill(e, 'gun', Math.atan2(b.vx, b.vz)); dead = true; break; }
      if (!dead && b.owner === 'p') for (const e of f.enemies) if (e.alive && e.down > 0 && e.k !== 'boss' && PH.segmentCircle(ox, oz, b.x, b.z, e.x, e.z, e.r)) { this.kill(e, 'gun', Math.atan2(b.vx, b.vz)); dead = true; break; }
      if (!dead && b.owner === 'e' && p.alive && PH.segmentCircle(ox, oz, b.x, b.z, p.x, p.z, .3) && p.inv <= 0) { this.hurt('bullet'); dead = true; }   // invulnerable (dash) frames let bullets pass; plating consumes the bullet
      if (dead) { HL.world.remove(b.m); f.bullets.splice(i, 1); }
    }
  },
  thrownStep(dt) {
    const f = this.F;
    for (let i = f.thrown.length - 1; i >= 0; i--) {
      const t = f.thrown[i], ox = t.x, oz = t.z; t.x += t.vx * dt; t.z += t.vz * dt; t.life -= dt; t.m.position.set(t.x, 1.1, t.z); t.m.rotation.y += dt * 20; let stop = t.life <= 0;
      for (const c of HL.colliders) if (c.on && !c.low && PH.segmentBox(ox, oz, t.x, t.z, c)) { stop = true; t.x = ox; t.z = oz; break; }
      if (!stop) for (const e of f.enemies) if (e.alive && PH.segmentCircle(ox, oz, t.x, t.z, e.x, e.z, e.r + .15)) { if (e.down > 0) this.kill(e, 'thrown', Math.atan2(t.vx, t.vz)); else { this.down(e, 3.2, 'thrown'); this.award(30, 'THROWN', e.x, e.z); } stop = true; break; }
      if (stop) { HL.world.remove(t.m); this.addPickup(t.x, t.z, t.type, null, t.ammo); f.thrown.splice(i, 1); A.thump(.3); }
    }
  },
  fxStep(dt) { const f = this.F; for (let i = f.fx.length - 1; i >= 0; i--) { const s = f.fx[i]; s.vy -= 9 * dt; s.m.position.x += s.vx * dt; s.m.position.y = Math.max(.05, s.m.position.y + s.vy * dt); s.m.position.z += s.vz * dt; s.m.rotation.x += s.rx * dt; s.life -= dt; s.mat.opacity = clamp(s.life / .5, 0, 1); if (s.life <= 0) { HL.world.remove(s.m); f.fx.splice(i, 1); } } },
  cameraStep(dt) {
    const p = this.p, K = HL.keys, aim = this.aim || { x: p.x, z: p.z }, look = K.Space ? .6 : .16;
    let tx = p.x + (aim.x - p.x) * look, tz = p.z + (aim.z - p.z) * look; tx = clamp(tx, p.x - 11, p.x + 11); tz = clamp(tz, p.z - 8, p.z + 8);
    const k = 1 - Math.exp(-6 * dt); HL.camera.position.x += (tx - HL.camera.position.x) * k; HL.camera.position.y = 13; HL.camera.position.z += (tz + 7.5 - HL.camera.position.z) * k;
    const sh = S.calm ? 0 : (S.shake || 0); S.shake = Math.max(0, (S.shake || 0) - dt); HL.camera.position.x += (Math.random() - .5) * sh; HL.camera.position.z += (Math.random() - .5) * sh;
    HL.camera.lookAt(HL.camera.position.x, 0, HL.camera.position.z - 7.5); HL.camera.fov = 50; HL.camera.updateProjectionMatrix();
  },
  hudStep(psy) {
    const w = this.p.weapon ? WEAP[this.p.weapon.type] : this.weaponDef(), ammo = this.p.weapon && WEAP[this.p.weapon.type].gun ? ' ' + this.p.weapon.ammo : '';
    $('hlFloor').textContent = `${this.F.def.name}  ·  dream #${HL.session.seed}`; $('hlScore').textContent = this.score + ' PTS'; $('hlCombo').textContent = this.combo > 1 ? `${this.combo}× COMBO` : '';
    $('hlWeapon').textContent = (this.p.weapon ? w.label : this.weaponDef().label) + ammo;
    $('hlPsy').innerHTML = `CYBERPSYCHOSIS ${Math.round(psy)}%  ×${this.mult().toFixed(2)}${this.F.shield > 0 ? '  ·  PLATING' : ''}${this.has('dash') ? (this.p.dashCd > 0 ? `  ·  DASH ${this.p.dashCd.toFixed(1)}s` : '  ·  DASH READY') : ''}<div class="bar"><i style="width:${clamp(psy, 0, 100)}%"></i></div>`;
  },
  /* ───── floor end ───── */
  finishFloor() {
    const f = this.F; if (f.done) return; f.done = true; this.stats.floors++; const bonus = Math.max(0, Math.round(1500 - f.t * 12)); this.score += bonus; this.popup(`TIME +${bonus}`, this.p.x, this.p.z, '#4ac8ff');
    if (this.floor + 1 < MAPS.FLOORS.length) { this.msg(`FLOOR ${this.floor + 1} CLEAR`, 1500); setTimeout(() => { if (S.chapter === HL.idx.hotline && this.running) this.loadFloor(this.floor + 1); }, 1400); }
    else this.finish(true);
  },
  finish(won) {
    this.running = false; hud.classList.add('hidden'); const st = this.stats, total = this.score - st.deaths * 150, grade = total > 7000 ? 'S' : total > 5000 ? 'A' : total > 3000 ? 'B' : 'C';
    const pay = Math.round(60 * st.floors + Math.max(0, total) / 40); this.pay = pay; this.paid = false; S.psyBase = S.psyBase || 0;
    res.innerHTML = `<div class="hbox"><h2>${won ? 'The Chairman is dead' : 'Raid over'}</h2><p>The tower is quiet. The lift, finally, goes down.</p>
      <p style="font-family:Impact;font-size:22px;font-style:italic">Grade <span style="color:#ff3aa0">${grade}</span> · score ${total}<br><small style="font-family:Georgia;font-style:normal;font-size:14px;opacity:.8">${st.kills} kills · ${st.exec} executions · ${st.doors} door stuns · ${st.deaths} deaths · cyberpsychosis ${Math.round(this.psy())}%</small></p>
      <p>The Resistance pays <b>${pay} ₵</b> for the family purse.${this.psy() >= 70 ? ' <i>Your hands will not stop twitching tonight.</i>' : ''}</p>
      <div><button class="hbtn" id="hrAgain">Again</button><button class="hbtn alt" id="hrDay">Back to the Poors</button><button class="hbtn alt" id="hrMenu">Menu</button></div></div>`;
    res.classList.remove('hidden'); $('hrAgain').onclick = () => { this.collect(); res.classList.add('hidden'); this.openSelect(); }; $('hrDay').onclick = () => { this.collect(); if (S.dayStarted && HL.idx.day != null) HL.goChapter(HL.idx.day); else location.reload(); }; $('hrMenu').onclick = () => { this.collect(); location.reload(); };
  },
  collect() { if (this.paid || !this.pay) return; this.paid = true; if (HL.day && HL.day.D) HL.day.contract(this.pay, 180); else S.carryMoney = (S.carryMoney || 0) + this.pay; },
};
HL.registerChapter('hotline', chHot);
HL.cleanups.push(i => { if (i !== HL.idx.hotline) { hud.classList.add('hidden'); sel.classList.add('hidden'); res.classList.add('hidden'); document.body.classList.remove('hotline'); chHot.running = false; S.hueExtra = 0; } });
document.addEventListener('mousedown', e => { if (S.chapter !== HL.idx.hotline || !chHot.running || S.paused || e.target !== HL.canvas) return; A.init(); const p = chHot.p; if (!p.alive) { chHot.restart(); return; } if (e.button === 0) { chHot.mouseDown = true; chHot.attack(); } if (e.button === 2) chHot.throwOrPick(); });
document.addEventListener('mouseup', () => { chHot.mouseDown = false; });
document.addEventListener('contextmenu', e => { if (S.chapter === HL.idx.hotline) e.preventDefault(); });
document.addEventListener('keydown', e => { if (S.chapter !== HL.idx.hotline || !chHot.running) return; if (e.code === 'KeyR') chHot.restart(); if (e.code === 'KeyE') chHot.throwOrPick(); if (e.code === 'Escape') { S.paused = !S.paused; $('pause').classList.toggle('hidden', !S.paused); } });
const hb = $('hotlineBtn'); if (hb) hb.addEventListener('click', e => { e.stopPropagation(); S.dayStarted = false; HL.startGame(HL.idx.hotline); });
HL.hotline = chHot; HL.IMPLANTS = IMPLANTS;
HL.debugBoot();
})();
