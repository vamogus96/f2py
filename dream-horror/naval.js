/* HOLLOW LULLABY — space pirates of Poors (after 2100).
   1) THE CAPTAIN'S WATCH: a first-person dream of a void-galleon in battle (Aurel's father, Captain Teodor Ressel).
   2) THE VOID SKIRMISH: top-down space naval combat. Solo against bots, or online through the WebSocket relay (server.js).
      Pilot a sail-and-thruster galleon, fire broadsides, board crippled ships, and take either a Free Fleet or a Concord Navy mercenary contract.
      Boards and barrels crafted at the PCB bench and lathe (daytime) upgrade your ship. */
(() => {
'use strict';
const HL = window.HL, { S, A, T, clamp, rnd, pick, lerp } = HL, $ = HL.$;

/* ───────────── styles + DOM ───────────── */
const st = document.createElement('style');
st.textContent = `
#nav{position:fixed;inset:0;z-index:3;pointer-events:none;font-family:Impact,"Arial Black",sans-serif;font-style:italic;letter-spacing:.04em;color:#fff}
#nav.hidden,#navLobby.hidden,#navResult.hidden{display:none}
#nvScore{position:absolute;left:50%;top:10px;transform:translateX(-50%);font-size:clamp(18px,3vw,32px);text-shadow:2px 2px 0 #000;display:flex;gap:14px;align-items:center;white-space:nowrap}
#nvScore .p{color:#ffb040}#nvScore .n{color:#6aff9a}#nvScore small{font-size:11px;font-style:normal;font-family:Georgia,serif;opacity:.7;letter-spacing:.1em}
#nvBars{position:absolute;left:18px;bottom:22px;width:min(300px,50vw);font-size:12px}
.nb{height:9px;background:#ffffff22;margin:4px 0;position:relative}.nb i{display:block;height:100%}
#nvHull i{background:#ff5a4a}#nvSh i{background:#40d0ff}
#nvGuns{position:absolute;right:18px;bottom:22px;font-size:13px;text-align:right;text-shadow:1px 1px 0 #000}
#nvRadar{position:absolute;right:14px;top:14px;left:auto;bottom:auto;inset:14px 14px auto auto;width:150px;height:150px;border:1px solid #ffffff44;border-radius:50%;background:#0006}
#nvFeed{position:absolute;left:14px;top:12px;font-family:Georgia,serif;font-style:normal;font-size:12px;line-height:1.5;max-width:30vw;text-shadow:1px 1px 0 #000}
#nvMsg{position:absolute;left:50%;top:22%;transform:translateX(-50%) skewX(-8deg);font-size:clamp(20px,4vw,44px);text-align:center;width:90vw;text-shadow:3px 3px 0 #ff2244;opacity:0;transition:opacity .25s}#nvMsg.on{opacity:1}
#nvHelp{position:absolute;left:18px;bottom:4px;font-family:Georgia,serif;font-style:normal;font-size:10px;opacity:.45}
#navLobby,#navResult{position:fixed;inset:0;z-index:7;background:radial-gradient(ellipse at center,#0d0a18f2,#020204fa);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;color:#e8dcc4;text-align:center;overflow:auto;padding:14px}
.nbox{max-width:640px;width:100%}.nbox h2{font-weight:400;letter-spacing:.25em;text-transform:uppercase;font-size:clamp(20px,3.6vw,34px);margin:0 0 8px}
.nbox p{opacity:.72;line-height:1.6;font-size:14px;margin:6px 0}
.nbox input{font:inherit;background:#0b0809;color:#e8dcc4;border:1px solid #6a5a44;padding:7px 9px;margin:4px;width:150px}
.nbox input.wide{width:230px}
.nbtn{font:inherit;font-size:13px;padding:9px 16px;margin:5px;border:1px solid #d9d2c466;background:#15110f;color:#e8dcc4;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
.nbtn.sel{border-color:#ffd890;background:#2a2016;color:#ffd890}.nbtn.go{border-color:#7ad06a;color:#b4ff8a}.nbtn:disabled{opacity:.35}
#nvStatus{min-height:20px;font-size:12px;color:#9fe0ff;margin:6px 0}
body.naval #dot,body.naval #san,body.naval #hint,body.naval #prompt{display:none}
`;
document.head.appendChild(st);
const nav = document.createElement('div'); nav.id = 'nav'; nav.className = 'hidden';
nav.innerHTML = `<div id="nvFeed"></div><div id="nvScore"></div><canvas id="nvRadar" width="150" height="150"></canvas><div id="nvMsg"></div>
  <div id="nvBars"><div id="nvHullT">HULL</div><div class="nb" id="nvHull"><i></i></div><div>SHIELD</div><div class="nb" id="nvSh"><i></i></div></div><div id="nvGuns"></div>
  <div id="nvHelp">W thrust · S brake · A/D turn · Shift boost · LMB broadside toward cursor · Q/E port/starboard · F board a crippled ship · Esc pause</div>`;
document.body.appendChild(nav);
const lobby = document.createElement('div'); lobby.id = 'navLobby'; lobby.className = 'hidden';
lobby.innerHTML = `<div class="nbox"><h2>Void skirmish</h2>
  <p>The Poors boundary, 2147. Free Fleet raiders from the city of Poors and Concord Navy contractors fight over the freight lanes at the edge of Fool Night. Take a side. First fleet to <b>15</b> kills wins. Cripple a ship, then <b>board it</b> for salvage.</p>
  <div><input id="nvName" value="Ressel" maxlength="16" aria-label="callsign"></div>
  <div><button class="nbtn sel" data-team="pirate">Poors Free Fleet (pirates)</button><button class="nbtn" data-team="navy">Concord Navy (mercenary contract)</button></div>
  <p id="nvUpg"></p>
  <div><button class="nbtn go" id="nvSolo">Solo skirmish (bots)</button></div>
  <p style="margin-top:14px">Online (needs <code>node server.js</code>, see README)</p>
  <div>Room <input id="nvRoom" value="poors"> Server <input id="nvUrl" class="wide"> <button class="nbtn go" id="nvJoin">Join online</button></div>
  <div id="nvStatus"></div><div><button class="nbtn" id="nvBack">Back</button></div></div>`;
document.body.appendChild(lobby);
const res = document.createElement('div'); res.id = 'navResult'; res.className = 'hidden';
res.innerHTML = '<div class="nbox"><h2 id="nrT">Contract complete</h2><p id="nrB"></p><div><button class="nbtn go" id="nrAgain">Fight again</button><button class="nbtn" id="nrDay">Back to the Poors</button><button class="nbtn" id="nrMenu">Menu</button></div></div>';
document.body.appendChild(res);

/* ═════════════════════════ 1) THE CAPTAIN'S WATCH — first-person pirate dream ═════════════════════════ */
const chPirate = {
  name: ['Dream', "The Captain's Watch"],
  build() {
    const { scene, amb, moon } = HL; scene.fog.color.set(0x05060e); scene.fog.density = .007; scene.background.set(0x02030a);
    amb.color.set(0x5a6890); amb.intensity = 1.0; moon.intensity = .9; moon.color.set(0xffa868); moon.position.set(-30, 10, 5);
    const wood = HL.texWood(true), dark = HL.mat({ color: 0x1c120c }), wm = HL.mat({ map: wood });
    this.t = 0; this.hits = 0; this.hull = 0; this.shieldDown = false; this.bridgeT = -1; this.cd = 0; this.shells = []; this.fx = []; this.volley = 4; this.done = false;
    // our ship
    HL.slab(8, 26, 0, 0, 0, wood, 2); HL.box(9, 2.4, 27.5, 0, -1.3, 0, dark, false);
    HL.box(.2, 1.1, 26, 4.1, .55, 0, wm, true); HL.box(.2, 1.1, 4.2, -4.1, .55, -10.9, wm, true); HL.box(.2, 1.1, 20.2, -4.1, .55, 2.9, wm, true);
    this.gate = { x0: -4.3, x1: -3.9, z0: -8.8, z1: -7.2, on: true }; HL.colliders.push(this.gate); HL.box(.06, .06, 1.6, -4.1, .9, -8, HL.mat({ color: 0xb59a5a }), false);
    HL.box(8.4, 1.1, .2, 0, .55, -13.1, wm, true); HL.box(8.4, 1.1, .2, 0, .55, 13.1, wm, true);
    [-4, 5].forEach(z => { HL.cyl(.16, .22, 12, 0, 6, z, dark, 8); const sl = new T.Mesh(new T.PlaneGeometry(7, 6), new T.MeshBasicMaterial({ color: 0xffb860, transparent: true, opacity: .45, side: T.DoubleSide })); sl.position.set(0, 7.5, z); HL.world.add(sl); });
    const wheel = new T.Mesh(new T.TorusGeometry(.5, .05, 6, 14), HL.mat({ color: 0x6a4a2a })); wheel.position.set(0, 1.3, 10.6); wheel.rotation.y = Math.PI / 2 * 0; HL.world.add(wheel);
    // the captain at the helm, back turned
    const cap = HL.makeFighter('player'); cap.position.set(0, 0, 11.5); cap.rotation.y = Math.PI; cap.scale.setScalar(1.08); HL.world.add(cap);
    HL.cyl(.3, .3, .06, 0, 1.95, 0, dark, 10, cap); HL.cyl(.17, .17, .22, 0, 2.06, 0, dark, 10, cap); HL.cyl(.22, .42, .9, 0, .55, 0, HL.mat({ color: 0x2a2630 }), 9, cap);
    this.cap = cap; this.capSpoke = false;
    // crew
    this.crew = [[-2.4, -3], [-2.4, 5], [1.6, 1], [2.2, -6]].map(([x, z]) => { const c = HL.makeFighter('player'); c.position.set(x, 0, z); c.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI; c.scale.setScalar(.98); HL.world.add(c); return c; });
    // port cannons
    this.cannons = [-5, -1, 3, 7].map(z => {
      HL.box(1.1, .5, .8, -3.2, .25, z, dark, false); const b = HL.cyl(.13, .17, 1.7, -3.8, 1.0, z, HL.mat({ color: 0x24262c, emissive: 0x08080a }), 8); b.rotation.z = Math.PI / 2;
      const it = HL.addInteract({ position: new T.Vector3(-3.2, 1, z) }, 'Fire the port cannon', () => this.fire(z), 2.7); return { z, it };
    });
    // the enemy
    const E = this.E = new T.Group(); E.position.set(-24, 0, 0); HL.world.add(E);
    HL.box(9, .3, 28, 0, 0, 0, HL.mat({ color: 0x3a1a1a, emissive: 0x120606 }), false, E); HL.box(10, 2.6, 29, 0, -1.4, 0, HL.mat({ color: 0x24100e }), false, E);
    [-6, 4].forEach(z => { HL.cyl(.16, .22, 11, 0, 5.5, z, dark, 8, E); const sl = new T.Mesh(new T.PlaneGeometry(6, 5), new T.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: .35, side: T.DoubleSide })); sl.position.set(0, 7, z); E.add(sl); });
    for (let i = 0; i < 4; i++) { const l = new T.PointLight(0xff4a2a, .6, 9, 1.5); l.position.set(0, 2, -9 + i * 6); E.add(l); }
    this.shield = new T.Mesh(new T.SphereGeometry(1, 24, 16), new T.MeshBasicMaterial({ color: 0x40d0ff, transparent: true, opacity: .1, blending: T.AdditiveBlending, side: T.DoubleSide, depthWrite: false })); this.shield.scale.set(13, 9, 19); this.shield.position.set(-24, 2, 0); HL.world.add(this.shield);
    this.foes = [[-3, -9], [0, 2], [2, 8]].map(([x, z]) => { const w = HL.makeWatcher(1.05); w.position.set(-24 + x, .15, z); HL.world.add(w); return w; });
    this.logbook = new T.Group(); HL.box(.5, .08, .36, 0, 0, 0, HL.mat({ color: 0x6a3a1a, emissive: 0x2a1408 }), false, this.logbook); this.logbook.position.set(-24, 1.05, -1); HL.box(.7, .9, .6, -24, .45, -1, HL.mat({ color: 0x2a1a12 }), false); HL.world.add(this.logbook);
    const lg = new T.PointLight(0xffd890, 1.2, 6, 1.4); lg.position.set(0, .7, 0); this.logbook.add(lg);
    this.logIt = HL.addInteract(this.logbook, "Take the captain's logbook", () => this.take(), 2.5); this.logIt.on = false;
    this.grapIt = HL.addInteract({ position: new T.Vector3(-3.3, 1.4, -9.5) }, 'Fire the grapple', () => this.grapple(), 2.8); this.grapIt.on = false;
    // sky: planet below, boundary sun at the horizon, stars
    const planet = new T.Mesh(new T.SphereGeometry(300, 32, 20), new T.MeshBasicMaterial({ color: 0x0c0710, fog: false })); planet.position.set(0, -330, -80); HL.world.add(planet);
    const halo = new T.Mesh(new T.SphereGeometry(308, 32, 20), new T.MeshBasicMaterial({ color: 0xff8a40, transparent: true, opacity: .22, side: T.BackSide, blending: T.AdditiveBlending, fog: false, depthWrite: false })); halo.position.copy(planet.position); HL.world.add(halo);
    const sun = new T.Mesh(new T.PlaneGeometry(260, 150), new T.MeshBasicMaterial({ map: HL.mkCanvas(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,200,120,1)'); r.addColorStop(.3, 'rgba(255,120,50,.5)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }), transparent: true, blending: T.AdditiveBlending, fog: false, depthWrite: false })); sun.position.set(-190, 10, -80); sun.rotation.y = Math.PI / 2; HL.world.add(sun);
    const sg = new T.BufferGeometry(), sa = new Float32Array(700 * 3); for (let i = 0; i < 700; i++) { const r = rnd(80, 200), a = rnd(0, 6.28), b = rnd(.05, 1.4); sa[i * 3] = Math.cos(a) * r * Math.cos(b); sa[i * 3 + 1] = Math.sin(b) * r * .8; sa[i * 3 + 2] = Math.sin(a) * r * Math.cos(b); }
    sg.setAttribute('position', new T.BufferAttribute(sa, 3)); HL.world.add(new T.Points(sg, new T.PointsMaterial({ color: 0xd8d0ff, size: .5, fog: false })));
    HL.pointLight(0xffc890, 1.4, 14, 0, 3, 10); HL.pointLight(0xffa060, 1.0, 18, -3, 3, -4);
    HL.player.x = 1.5; HL.player.z = 8.5; HL.player.yaw = Math.PI * .5; HL.player.pitch = -.05;
    HL.later(1200, () => HL.say('Port battery! They have us on the beam. Fire the guns, Aurel!', 5200));
    HL.later(6500, () => HL.say('Four hits and the shield will pop. Then we grapple her.', 5000));
  },
  spawnShell(x0, y0, z0, x1, y1, z1, dur, color, cb) {
    const m = new T.Mesh(new T.SphereGeometry(.22, 8, 6), new T.MeshBasicMaterial({ color })); m.position.set(x0, y0, z0); HL.world.add(m);
    const l = new T.PointLight(color, .9, 6, 1.5); m.add(l); this.shells.push({ m, a: [x0, y0, z0], b: [x1, y1, z1], t: 0, dur, cb });
  },
  flash(x, y, z, color = 0xffc060, big = 1) {
    const l = new T.PointLight(color, 3 * big, 14, 1.4); l.position.set(x, y, z); HL.world.add(l); const sm = new T.MeshBasicMaterial({ color, transparent: true, opacity: .9 }), s = new T.Mesh(new T.SphereGeometry(.5 * big, 8, 6), sm); s.position.copy(l.position); HL.world.add(s);
    this.fx.push({ l, s, sm, t: 0, life: .35 * big });
  },
  fire(z) {
    if (this.cd > 0 || this.done) return; this.cd = 1.3; HL.A.burst(900, .7, .3, .55); HL.A.thump(.7); HL.S.shake = .35;
    this.flash(-4.7, 1.0, z, 0xffd080, .7);
    const tz = rnd(-5, 5); this.spawnShell(-4.7, 1.0, z, -17.5, rnd(1, 3), tz, 1.0, 0xffd890, () => this.impact(-17.5, 2, tz));
  },
  impact(x, y, z) {
    if (!this.shieldDown) {
      this.hits++; this.shield.material.opacity = .32; this.flash(x, y, z, 0x40d0ff, .8); HL.A.burst(2400, 1, .4, .3);
      if (this.hits >= 4) { this.shieldDown = true; this.shield.visible = false; HL.A.sting(.7); HL.S.flash = .4; HL.say('The shield pops like a soap bubble. The grapple, at the bow! Now!', 5500); this.grapIt.on = true; }
      else HL.say(`Shield holding... (${this.hits}/4)`, 1600);
    } else { this.hull++; this.flash(-20.2, 1.5, z, 0xff6a2a, 1.2); HL.A.burst(300, .6, .5, .5); if (this.hull === 2) HL.say('Their engines are dead. Go, Aurel. Over the bridge.', 4000); }
  },
  grapple() {
    if (this.bridgeT >= 0) return; this.bridgeT = 0; this.grapIt.on = false; HL.A.creak(1.4, .09); HL.A.burst(500, 1, .5, .4);
    this.plank = HL.box(15.3, .12, 1.4, -4.2 - 7.65, -.06, -8, HL.mat({ map: HL.texWood(true) }), false); this.plank.scale.x = .001;
    HL.say('She is hooked. Walk the plank, my boy. Mind the void.', 4500);
  },
  take() {
    if (this.done) return; this.done = true; this.logIt.on = false; HL.S.pirateSeen = true; HL.A.sting(.9); HL.S.flash = .8;
    HL.say("Logbook of the Lullaby, Capt. T. Ressel: \"If you read this, you are old enough to be afraid of the right things. Bring her home through Fool Night.\"", 9000);
    HL.later(6500, () => { HL.S.fadeTarget = 0; }); HL.later(8600, () => { try { localStorage.setItem('hl-pirate', '1'); } catch (e) { /* ignore */ } if (HL.S.fromDay && HL.idx.day != null) { HL.goChapter(2); HL.lockPointer(); } else HL.showEnd('The Lullaby is moored at the Poors free docks. She is waiting for a crew.'); });
  },
  update(dt) {
    this.t += dt; this.cd -= dt; HL.S.wind = .02; HL.S.tension = .35; HL.S.insanBase = .1;
    // enemy volleys
    this.volley -= dt;
    if (this.volley <= 0 && !this.done) {
      this.volley = this.shieldDown ? rnd(7, 10) : rnd(4, 6);
      for (let i = 0; i < 3; i++) { const sz = rnd(-6, 8), tx = rnd(-3, 3), tz = rnd(-9, 11); this.flash(-19.8, 2, sz, 0xff6a3a, .8); this.spawnShell(-19.8, 2, sz, tx, 1.5, tz, 1.1 + i * .12, 0xff5a3a, () => { this.flash(tx, 1.2, tz, 0xffa040, 1); HL.S.shake = .8; HL.S.spike = Math.max(HL.S.spike, .18); HL.A.burst(250, .6, .5, .6); HL.A.thump(.8); }); }
      HL.A.burst(700, .7, .35, .4);
    }
    // projectiles and flashes
    for (let i = this.shells.length - 1; i >= 0; i--) { const s = this.shells[i]; s.t += dt; const k = clamp(s.t / s.dur, 0, 1); s.m.position.set(lerp(s.a[0], s.b[0], k), lerp(s.a[1], s.b[1], k) + Math.sin(k * Math.PI) * 1.2, lerp(s.a[2], s.b[2], k)); if (k >= 1) { HL.world.remove(s.m); this.shells.splice(i, 1); s.cb && s.cb(); } }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt; const k = f.t / f.life; f.l.intensity = 3 * (1 - k); f.sm.opacity = .9 * (1 - k); f.s.scale.setScalar(1 + k * 2); if (k >= 1) { HL.world.remove(f.l); HL.world.remove(f.s); this.fx.splice(i, 1); } }
    this.shield.material.opacity = lerp(this.shield.material.opacity, .08, dt * 3);
    // ship motion
    HL.world.position.y = Math.sin(this.t * .7) * .05; HL.world.rotation.z = Math.sin(this.t * .5) * .004;
    this.crew.forEach((c, i) => { c.position.y = Math.abs(Math.sin(this.t * 2 + i)) * .04; });
    this.cap.rotation.y = Math.PI + Math.sin(this.t * .3) * .05;
    const pd = Math.hypot(HL.player.x - this.cap.position.x, HL.player.z - this.cap.position.z);
    if (pd < 4 && !this.capSpoke) { this.capSpoke = true; HL.say('Captain, without turning: "Port side, Aurel. Never look at the water."', 5500); HL.S.ring = .02; }
    // the grapple bridge
    if (this.bridgeT >= 0 && this.bridgeT < 1) { this.bridgeT = Math.min(1, this.bridgeT + dt / 1.2); this.plank.scale.x = Math.max(.001, this.bridgeT); this.plank.position.x = -4.2 - 7.65 * this.bridgeT; if (this.bridgeT >= 1) { this.gate.on = false; this.logIt.on = true; [[-19.6, -4.1, -8.9, -8.7], [-19.6, -4.1, -7.3, -7.1]].forEach(([a, b, c, d]) => HL.colliders.push({ x0: a, x1: b, z0: c, z1: d, on: true, noLos: true })); [[-28.6, -28.4, -14, 14], [-28.5, -19.4, -14.2, -14], [-28.5, -19.4, 14, 14.2], [-19.6, -19.4, -14, -8.7], [-19.6, -19.4, -7.3, 14]].forEach(([a, b, c, d]) => HL.colliders.push({ x0: a, x1: b, z0: c, z1: d, on: true, noLos: true })); } }
    // the boarding party turns when you look away
    this.foes.forEach(w => { const seen = HL.canSee(w.position.x, 1.6, w.position.z, 40, .5); if (!seen) { w.rotation.y = Math.atan2(HL.player.x - w.position.x, HL.player.z - w.position.z); w.userData.head.rotation.z = .18 + Math.sin(this.t * 6 + w.position.z) * .1; } else HL.S.sanity = Math.max(.15, HL.S.sanity - dt * .01); });
    this.logbook.rotation.y += dt;
  },
};
HL.registerChapter('pirate', chPirate);

/* ═════════════════════════ 2) THE VOID SKIRMISH — top-down space naval combat ═════════════════════════ */
const FAC = {
  pirate: { name: 'Poors Free Fleet', hull: 0x6a4a2a, trim: 0xffa030, sail: 0x40d0ff, css: 'p' },
  navy: { name: 'Concord Navy', hull: 0x8a9a90, trim: 0x6aff9a, sail: 0xf0f4ff, css: 'n' },
};
const LIMIT = 15, ARENA = 68;
function makeShip(team) {
  const F = FAC[team], g = new T.Group(), hm = HL.mat({ color: F.hull, flatShading: true, emissive: 0x0a0806 }), tm = new T.MeshBasicMaterial({ color: F.trim });
  HL.box(1.5, .55, 4.2, 0, .3, 0, hm, false, g); const bg = new T.ConeGeometry(.75, 1.5, 4); bg.rotateY(Math.PI / 4); bg.rotateX(Math.PI / 2); const bow = new T.Mesh(bg, hm); bow.position.set(0, .3, 2.85); bow.scale.y = .75; g.add(bow);
  HL.box(1.62, .07, 4.2, 0, .62, 0, tm, false, g);
  [[.6, 2.4], [-.9, 2.0]].forEach(([z, h]) => { HL.cyl(.05, .07, h, 0, .6 + h / 2, z, HL.mat({ color: 0x222 }), 5, g); const sl = new T.Mesh(new T.PlaneGeometry(2.0, h * .72), new T.MeshBasicMaterial({ color: F.sail, transparent: true, opacity: .5, side: T.DoubleSide })); sl.position.set(0, .8 + h * .5, z); g.add(sl); });
  [-1, 1].forEach(s => [-1, 0, 1].forEach(z => HL.box(.3, .18, .5, s * .82, .62, z * .9, HL.mat({ color: 0x24262c }), false, g)));
  const flame = new T.Mesh(new T.ConeGeometry(.35, 1.6, 6), new T.MeshBasicMaterial({ color: F.trim, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false })); flame.geometry.rotateX(-Math.PI / 2); flame.position.set(0, .35, -3.0); g.add(flame); g.userData.flame = flame;
  g.scale.setScalar(1.3); return g;
}
const Net = {
  ws: null, id: null, on: false,
  connect(url, room, name, team, onmsg, onstatus) {
    try { this.ws = new WebSocket(url); } catch (e) { onstatus('Bad server address.'); return; }
    this.ws.onopen = () => { this.on = true; this.ws.send(JSON.stringify({ t: 'join', room, name, team })); onstatus('Connected. Joining room…'); };
    this.ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } onmsg(m); };
    this.ws.onerror = () => onstatus('Could not reach the relay. Run "node server.js" and check the address.');
    this.ws.onclose = () => { const was = this.on; this.on = false; if (was) onmsg({ t: 'closed' }); };
  },
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); },
  close() { this.on = false; try { this.ws && this.ws.close(); } catch (e) { /* ignore */ } this.ws = null; },
};

const chNaval = {
  name: ['Contract', 'The Poors Boundary'], combat: true,
  team: 'pirate', playing: false, online: false, ships: [], shells: [], rocks: [], fx: [], scores: { pirate: 0, navy: 0 }, feed: [], me: null,
  build() {
    S.uiMode = true; S.flashlightOn = false; try { document.exitPointerLock(); } catch (e) { /* ignore */ }
    document.body.classList.add('combat', 'naval'); HL.scene.fog.color.set(0x030208); HL.scene.fog.density = .004; HL.scene.background.set(0x030208);
    HL.amb.color.set(0x8a80c0); HL.amb.intensity = .95; HL.moon.intensity = .9; HL.moon.color.set(0xffb070); HL.moon.position.set(-30, 40, 10);
    this.playing = false; this.ships = []; this.shells = []; this.fx = []; this.rocks = []; this.online = false; this.me = null; this.ended = false;
    // the world beneath the arena: Fool Night's boundary, lit edge on the left, the dark side with city lights on the right
    const tex = HL.mkCanvas(512, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#d8884a'); gr.addColorStop(.38, '#6a3a30'); gr.addColorStop(.5, '#1a1028'); gr.addColorStop(1, '#04030a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalAlpha = .12; for (let i = 0; i < 60; i++) { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(rnd(0, w * .6), rnd(0, h), rnd(30, 120), rnd(4, 14), 0, 0, 7); g.fill(); } g.globalAlpha = 1;
      for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < .5 ? '#ffb860' : '#ff7a3a'; g.globalAlpha = rnd(.3, 1); g.fillRect(rnd(w * .42, w * .8), rnd(0, h), 2, 2); } g.globalAlpha = 1;
    });
    const ground = new T.Mesh(new T.PlaneGeometry(520, 520), new T.MeshBasicMaterial({ map: tex, fog: false })); ground.rotation.x = -Math.PI / 2; ground.position.y = -40; HL.world.add(ground);
    const sg = new T.BufferGeometry(), sa = new Float32Array(500 * 3); for (let i = 0; i < 500; i++) { sa[i * 3] = rnd(-150, 150); sa[i * 3 + 1] = rnd(-30, -2); sa[i * 3 + 2] = rnd(-150, 150); }
    sg.setAttribute('position', new T.BufferAttribute(sa, 3)); HL.world.add(new T.Points(sg, new T.PointsMaterial({ color: 0xd8d0ff, size: .5, fog: false })));
    // asteroids and the station
    const rng = HL.mulberry(HL.session.seed * 17 + 5), rm = HL.mat({ color: 0x4a4048, flatShading: true });
    for (let i = 0; i < 16; i++) { let x, z, r; do { x = (rng() - .5) * 110; z = (rng() - .5) * 90; r = 1.6 + rng() * 3.2; } while (Math.hypot(x, z) < 12 || Math.abs(x) > 44); const m = new T.Mesh(new T.IcosahedronGeometry(r, 0), rm); m.position.set(x, 0, z); m.scale.y = .6; m.rotation.set(rng() * 6, rng() * 6, 0); HL.world.add(m); this.rocks.push({ x, z, r: r * .95, m }); }
    const stn = new T.Group(); HL.world.add(stn); this.station = stn;
    const ring = new T.Mesh(new T.TorusGeometry(5.2, .7, 8, 24), HL.mat({ color: 0x5a5a66, emissive: 0x16161c, flatShading: true })); ring.rotation.x = Math.PI / 2; stn.add(ring); this.ring = ring;
    HL.cyl(1.6, 2.2, 3, 0, 0, 0, HL.mat({ color: 0x4a4a54, flatShading: true }), 8, stn);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; HL.box(.5, .3, .5, Math.cos(a) * 5.2, .8, Math.sin(a) * 5.2, new T.MeshBasicMaterial({ color: i % 3 ? 0xffb860 : 0x60d0ff }), false, ring.parent); }
    this.rocks.push({ x: 0, z: 0, r: 6.2, m: null, station: true }); HL.pointLight(0xffb060, 1.4, 20, 0, 4, 0);
    this.aim = new T.Vector3(); this.cam = { x: 0, z: 0 };
    HL.camera.position.set(0, 44, 18); HL.camera.lookAt(0, 0, 0); HL.camera.fov = 50; HL.camera.updateProjectionMatrix();
    nav.classList.add('hidden'); res.classList.add('hidden');
    if (!this.autostart) this.openLobby(); else { const o = this.autostart; this.autostart = null; this.start(o); }
  },
  upgrades() { let p = { board: 0, barrel: 0 }; try { if (S.day && S.day.parts) p = S.day.parts; else { const sv = JSON.parse(localStorage.getItem('hl-save-v1') || 'null'); if (sv && sv.parts) p = sv.parts; } } catch (e) { /* ignore */ } return { board: clamp(p.board | 0, 0, 4), barrel: clamp(p.barrel | 0, 0, 4) }; },
  openLobby() {
    const u = this.upgrades(); $('nvUpg').innerHTML = `Ship upgrades from your workbench: <b>${u.barrel}</b> barrel(s) (+damage, +range) · <b>${u.board}</b> fire-control board(s) (faster reload, tighter spread). Craft more at the lathe and PCB bench.`;
    $('nvUrl').value = $('nvUrl').value || (location.protocol.startsWith('http') ? (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws' : 'ws://localhost:8787/ws');
    lobby.classList.remove('hidden');
  },
  spawnPoint(team) { const x = (team === 'pirate' ? -1 : 1) * 52, z = rnd(-26, 26); return { x, z, a: Math.atan2(-x, -z) }; },
  newShip(id, name, team, remote) {
    const sp = this.spawnPoint(team), mesh = makeShip(team); HL.world.add(mesh);
    const s = { id, name, team, remote: !!remote, x: sp.x, z: sp.z, a: sp.a, vx: 0, vz: 0, hp: 100, sh: 60, shT: 0, alive: true, respawnT: 0, cdL: 0, cdR: 0, boost: 0, boostCd: 0, mesh, upg: { board: 0, barrel: 0 }, kills: 0, deaths: 0, inv: 2, thrust: 0, board: null, tx: sp.x, tz: sp.z, ta: sp.a, bot: null };
    mesh.position.set(s.x, 0, s.z); mesh.rotation.y = s.a; this.ships.push(s); return s;
  },
  start(o) {
    lobby.classList.add('hidden'); res.classList.add('hidden'); nav.classList.remove('hidden');
    this.team = o.team || 'pirate'; this.name = (o.name || 'Ressel').slice(0, 16); this.scores = { pirate: 0, navy: 0 }; this.feed = []; this.ended = false; this.stats = { kills: 0, boards: 0, deaths: 0 };
    this.ships.forEach(s => HL.world.remove(s.mesh)); this.ships = []; this.shells.forEach(s => HL.world.remove(s.m)); this.shells = [];
    this.me = this.newShip('me', this.name, this.team, false); this.me.upg = this.upgrades(); this.me.inv = 3; this.t0 = performance.now();
    this.online = !!o.online;
    if (!this.online) {
      for (let i = 0; i < 3; i++) { const b = this.newShip('b' + i, 'Ally ' + (i + 1), this.team, false); b.bot = { think: 0, side: 1 }; }
      const other = this.team === 'pirate' ? 'navy' : 'pirate'; for (let i = 0; i < 4; i++) { const b = this.newShip('e' + i, FAC[other].name + ' ' + (i + 1), other, false); b.bot = { think: 0, side: 1 }; b.upg = { board: (i + (S.day ? S.day.n : 0)) % 2, barrel: (i + 1) % 2 }; }
      this.msg(`${FAC[this.team].name.toUpperCase()} — FIRST TO ${LIMIT}`, 2600); this.playing = true;
    } else {
      this.msg('CONNECTING…', 2000); $('nvStatus').textContent = '';
      Net.connect(o.url, o.room, this.name, this.team, m => this.onNet(m), t => { $('nvStatus').textContent = t; this.msg(t.toUpperCase(), 3500); });
      this.playing = true; this.syncT = 0;
    }
    this.cam.x = this.me.x; this.cam.z = this.me.z; this.hud();
  },
  /* ── networking ── */
  teamOf(id) { const s = this.ships.find(x => x.id === id); return s ? s.team : null; },
  onNet(m) {
    switch (m.t) {
      case 'welcome': this.me.id = m.id; Net.id = m.id; m.players.forEach(p => this.addRemote(p)); this.feedAdd(`Joined as pilot #${m.id}. ${m.players.length} other pilot(s) in the room.`); this.msg('ONLINE — FIRST TO ' + LIMIT, 2500); break;
      case 'join': this.addRemote(m); this.feedAdd(`${m.name} joined the ${FAC[m.team].name}.`); break;
      case 'leave': { const s = this.ships.find(x => x.id === m.id); if (s) { HL.world.remove(s.mesh); this.ships.splice(this.ships.indexOf(s), 1); this.feedAdd(`${s.name} left.`); } break; }
      case 's': { const s = this.ships.find(x => x.id === m.id); if (s) { s.tx = +m.x; s.tz = +m.z; s.ta = +m.a; s.vx = +m.vx || 0; s.vz = +m.vz || 0; s.hp = +m.hp; s.sh = +m.sh; const al = !!m.al; if (al && !s.alive) { s.x = s.tx; s.z = s.tz; s.a = s.ta; } s.alive = al; s.mesh.visible = al; } break; }
      case 'f': this.addShells(m.id, m.team === 'navy' ? 'navy' : 'pirate', (m.p || []).slice(0, 6), +m.d || 9, true); break;
      case 'k': this.onKill(m.killer, m.victim, !!m.b); break;
      case 'b': if (this.me.alive && m.id !== undefined && this.me.hp <= 25) { this.feedAdd('You were boarded!'); this.die(this.me, m.id, true); } break;
      case 'closed': this.msg('DISCONNECTED FROM RELAY', 3000); this.feedAdd('Connection to the relay was lost.'); break;
    }
  },
  addRemote(p) { if (this.ships.find(x => x.id === p.id)) return; const s = this.newShip(p.id, p.name, p.team === 'navy' ? 'navy' : 'pirate', true); s.mesh.visible = true; },
  /* ── combat ── */
  addShells(owner, team, arr, dmg, remote) {
    const cm = this.shellMat[team] || (this.shellMat[team] = new T.MeshBasicMaterial({ color: team === 'pirate' ? 0xffc060 : 0x9affc0 }));
    arr.forEach(p => { const m = new T.Mesh(this.shellGeo, cm); m.position.set(p[0], 1.1, p[1]); HL.world.add(m); this.shells.push({ m, x: p[0], z: p[1], vx: p[2], vz: p[3], life: 1.7, owner, team, dmg, remote: !!remote }); });
  },
  fire(s, sign) {
    if (!s.alive || s.inv > 2.5) return false; const key = sign > 0 ? 'cdR' : 'cdL'; if (s[key] > 0) return false;
    const u = s.upg; s[key] = 1.45 * (1 - .07 * u.board); const sx = Math.cos(s.a) * sign, sz = -Math.sin(s.a) * sign, fx = Math.sin(s.a), fz = Math.cos(s.a), sp = 40 * (1 + .05 * u.barrel), spread = .17 * (1 - .1 * u.board), shots = [];
    for (let i = -1; i <= 1; i++) { const r = (Math.random() - .5) * spread, ca = Math.cos(r), sa = Math.sin(r); shots.push([+(s.x + fx * i * 1.2 + sx * 1.3).toFixed(2), +(s.z + fz * i * 1.2 + sz * 1.3).toFixed(2), +((sx * ca - sz * sa) * sp + s.vx * .4).toFixed(2), +((sx * sa + sz * ca) * sp + s.vz * .4).toFixed(2)]); }
    const dmg = +(9 * (1 + .08 * u.barrel)).toFixed(1); this.addShells(s.id, s.team, shots, dmg, false);
    if (s === this.me) { A.burst(700, .7, .2, .35); A.thump(.35); S.shake = .12; if (this.online) Net.send({ t: 'f', team: s.team, p: shots, d: dmg }); } else if (Math.hypot(s.x - this.me.x, s.z - this.me.z) < 40) A.burst(900, .7, .1, .1);
    this.puff(s.x + sx * 1.3, s.z + sz * 1.3, s.team === 'pirate' ? 0xffc060 : 0x9affc0, 3); return true;
  },
  puff(x, z, color, n) { for (let i = 0; i < n; i++) { const sm = new T.MeshBasicMaterial({ color, transparent: true }), m = new T.Mesh(new T.TetrahedronGeometry(rnd(.1, .3)), sm); m.position.set(x, 1.1, z); HL.world.add(m); const a = rnd(0, 6.28), sp = rnd(2, 8); this.fx.push({ m, sm, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, vy: rnd(0, 4), life: rnd(.4, .9), t: 0 }); } },
  hurt(s, dmg, from) {
    if (!s.alive || s.inv > 0) return; if (s.sh > 0) { const d = Math.min(s.sh, dmg); s.sh -= d; dmg -= d; } s.hp -= dmg; s.shT = 4;
    if (s === this.me) { S.shake = .3; S.flash = Math.max(S.flash, .12); A.burst(300, .7, .2, .35); }
    if (s.hp <= 0) this.die(s, from, false);
  },
  die(s, killer, boarded) {
    if (!s.alive) return; s.alive = false; s.mesh.visible = false; s.respawnT = 4; s.hp = 0; s.deaths++; this.puff(s.x, s.z, 0xff8a40, 22); this.puff(s.x, s.z, 0xffffff, 8);
    if (Math.hypot(s.x - this.me.x, s.z - this.me.z) < 50) { A.sting(.3); A.burst(200, .5, .8, .6); }
    if (s === this.me) { this.stats.deaths++; this.msg('YOUR SHIP BREAKS UP — RESPAWNING', 2200); if (this.online) Net.send({ t: 'k', killer, victim: this.me.id, b: boarded ? 1 : 0 }); }
    if (!this.online || s === this.me) this.onKill(killer, s.id, boarded, s);
  },
  onKill(killer, victim, boarded, vs) {
    const kt = this.teamOf(killer), v = vs || this.ships.find(x => x.id === victim), kname = (this.ships.find(x => x.id === killer) || {}).name || 'a wreck', vname = v ? v.name : 'someone';
    if (kt) { this.scores[kt]++; } this.feedAdd(`${kname} ${boarded ? 'boarded' : 'sank'} ${vname}`);
    if (killer === this.me.id || killer === 'me') { this.stats.kills++; A.chime(); this.msg(boarded ? 'BOARDED — SALVAGE!' : 'SHIP DESTROYED', 1200); }
    if (v && this.online && v.remote) { v.alive = false; v.mesh.visible = false; }
    if (this.scores.pirate >= LIMIT || this.scores.navy >= LIMIT) this.endMatch();
  },
  tryBoard(dt) {
    const m = this.me; if (!m.alive) { m.board = null; return; }
    if (!keys.KeyF) { m.board = null; return; }
    if (!m.board) { let best = null, bd = 8; this.ships.forEach(s => { if (s.team !== m.team && s.alive && s.hp <= 25) { const d = Math.hypot(s.x - m.x, s.z - m.z); if (d < bd) { bd = d; best = s; } } }); if (best) m.board = { t: 0, target: best }; else return; }
    const b = m.board; if (!b.target.alive || Math.hypot(b.target.x - m.x, b.target.z - m.z) > 9) { m.board = null; return; }
    b.t += dt; if (b.t >= 1.5) { m.board = null; this.stats.boards++; if (this.online) Net.send({ t: 'b', target: b.target.id }); else this.die(b.target, 'me', true); A.chime(); }
  },
  /* ── per-frame ── */
  physics(s, ctl, dt) {
    const fx = Math.sin(s.a), fz = Math.cos(s.a), sx = Math.cos(s.a), sz = -Math.sin(s.a);
    let fwd = s.vx * fx + s.vz * fz, lat = s.vx * sx + s.vz * sz;
    s.boost = Math.max(0, s.boost - dt); s.boostCd = Math.max(0, s.boostCd - dt); if (ctl.boost && s.boostCd <= 0 && s.boost <= 0) { s.boost = 1.2; s.boostCd = 5; }
    const acc = ctl.thrust > 0 ? 15 * (s.boost > 0 ? 2.2 : 1) : ctl.thrust < 0 ? -8 : 0; fwd += acc * dt; fwd *= 1 - .3 * dt; lat *= 1 - 3.2 * dt;
    const max = s.boost > 0 ? 28 : 15; fwd = clamp(fwd, -6, max); s.a += ctl.turn * (1.6 + clamp(Math.abs(fwd) / 15, 0, 1) * .5) * dt; s.thrust = ctl.thrust;
    const nfx = Math.sin(s.a), nfz = Math.cos(s.a), nsx = Math.cos(s.a), nsz = -Math.sin(s.a); s.vx = nfx * fwd + nsx * lat; s.vz = nfz * fwd + nsz * lat;
    s.x += s.vx * dt; s.z += s.vz * dt;
    const r = Math.hypot(s.x, s.z); if (r > ARENA) { const k = ARENA / r; s.x *= k; s.z *= k; s.vx -= (s.x / r) * 12 * dt; s.vz -= (s.z / r) * 12 * dt; }
    for (const k of this.rocks) { const dx = s.x - k.x, dz = s.z - k.z, d = Math.hypot(dx, dz) || .01, mr = k.r + 1.4; if (d < mr) { s.x = k.x + dx / d * mr; s.z = k.z + dz / d * mr; const vn = s.vx * dx / d + s.vz * dz / d; if (vn < 0) { s.vx -= 1.6 * vn * dx / d; s.vz -= 1.6 * vn * dz / d; if (!s.remote && -vn > 5) this.hurt(s, -vn * .6, 'rock'); } } }
    s.shT = Math.max(0, s.shT - dt); if (s.shT <= 0 && s.sh < 60) s.sh = Math.min(60, s.sh + 9 * dt); s.cdL = Math.max(0, s.cdL - dt); s.cdR = Math.max(0, s.cdR - dt); s.inv = Math.max(0, s.inv - dt);
  },
  botThink(b, dt) {
    if (!b.bot) return { thrust: 0, turn: 0, boost: false };
    let tgt = null, bd = 1e9; this.ships.forEach(s => { if (s.team !== b.team && s.alive) { const d = Math.hypot(s.x - b.x, s.z - b.z); if (d < bd) { bd = d; tgt = s; } } });
    const c = { thrust: 0, turn: 0, boost: false };
    if (!tgt) { c.thrust = .5; const ta = Math.atan2(-b.x, -b.z); c.turn = clamp(this.angDiff(b.a, ta) * 2, -1, 1); return c; }
    const dx = tgt.x - b.x, dz = tgt.z - b.z, ta = Math.atan2(dx, dz); let side = this.angDiff(b.a, ta) > 0 ? 1 : -1;
    if (bd > 22) { const want = ta - side * .5; c.turn = clamp(this.angDiff(b.a, want) * 2.5, -1, 1); c.thrust = 1; }
    else if (bd < 9) { const want = ta + side * 2.3; c.turn = clamp(this.angDiff(b.a, want) * 2.5, -1, 1); c.thrust = 1; }
    else { const want = ta - side * Math.PI / 2; c.turn = clamp(this.angDiff(b.a, want) * 2.5, -1, 1); c.thrust = Math.hypot(b.vx, b.vz) < 8 ? 1 : 0; }
    b.bot.think -= dt; if (b.bot.think <= 0) { b.bot.think = rnd(.25, .6);
      const sx = Math.cos(b.a), sz = -Math.sin(b.a), dot = (dx * sx + dz * sz) / (bd || 1);
      if (bd < 34 && Math.abs(dot) > .8) { if (this.fire(b, dot > 0 ? 1 : -1)) b.bot.think = rnd(.5, 1); } }
    return c;
  },
  angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; },
  update(dt) {
    S.sanity = 1; S.insanBase = .03; S.scrape = 0; S.wind = .01; if (!this.me) return;
    this.ring && (this.ring.rotation.z += dt * .15);
    if (!this.playing) return;
    const me = this.me;
    // aim point
    const rc = new T.Raycaster(); rc.setFromCamera(HL.mouseNDC, HL.camera); const hit = new T.Vector3(); if (rc.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), hit)) this.aim.copy(hit);
    // local ship
    if (me.alive && !S.paused) {
      const ctl = { thrust: (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), turn: (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0), boost: keys.ShiftLeft || keys.ShiftRight };
      this.physics(me, ctl, dt);
      if (keys.KeyQ) this.fire(me, -1); if (keys.KeyE) this.fire(me, 1);
      if (this.mouseDown) { const sx = Math.cos(me.a), sz = -Math.sin(me.a); this.fire(me, ((this.aim.x - me.x) * sx + (this.aim.z - me.z) * sz) > 0 ? 1 : -1); }
      this.tryBoard(dt);
    } else if (!me.alive) { me.respawnT -= dt; if (me.respawnT <= 0) { const sp = this.spawnPoint(me.team); Object.assign(me, { x: sp.x, z: sp.z, a: sp.a, vx: 0, vz: 0, hp: 100, sh: 60, alive: true, inv: 3, mesh: me.mesh }); me.mesh.visible = true; } }
    // everyone else
    this.ships.forEach(s => {
      if (s === me) return;
      if (s.remote) { if (s.alive) { s.x = lerp(s.x, s.tx, clamp(dt * 12, 0, 1)); s.z = lerp(s.z, s.tz, clamp(dt * 12, 0, 1)); s.a += this.angDiff(s.a, s.ta) * clamp(dt * 12, 0, 1); s.x += s.vx * dt * .2; s.z += s.vz * dt * .2; } return; }
      if (!s.alive) { s.respawnT -= dt; if (s.respawnT <= 0) { const sp = this.spawnPoint(s.team); Object.assign(s, { x: sp.x, z: sp.z, a: sp.a, vx: 0, vz: 0, hp: 100, sh: 60, alive: true, inv: 2 }); s.mesh.visible = true; } return; }
      this.physics(s, this.botThink(s, dt), dt);
    });
    this.ships.forEach(s => { s.mesh.position.set(s.x, 0, s.z); s.mesh.rotation.y = s.a; s.mesh.rotation.z = lerp(s.mesh.rotation.z, -(s.thrust ? 0 : 0) , .1); const f = s.mesh.userData.flame; if (f) { f.scale.z = .6 + (s.thrust > 0 ? 1 : .3) * (s.boost > 0 ? 2.2 : 1) * (.8 + Math.random() * .4); f.visible = s.alive; } s.mesh.visible = s.alive && (s === me ? (s.inv > 0 ? Math.floor(S.time * 14) % 2 === 0 : true) : true); });
    // shells
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const b = this.shells[i]; b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt; b.m.position.set(b.x, 1.1, b.z); let dead = b.life <= 0;
      if (!dead) for (const k of this.rocks) if (Math.hypot(b.x - k.x, b.z - k.z) < k.r) { dead = true; this.puff(b.x, b.z, 0xaaaaaa, 2); break; }
      if (!dead) for (const s of this.ships) {
        if (!s.alive || s.team === b.team || Math.hypot(s.x - b.x, s.z - b.z) > 1.7) continue;
        if (!s.remote) this.hurt(s, b.dmg, b.owner); this.puff(b.x, b.z, 0xffffff, 3); dead = true; break;
      }
      if (dead) { HL.world.remove(b.m); this.shells.splice(i, 1); }
    }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt; f.vy -= 6 * dt; f.m.position.x += f.vx * dt; f.m.position.z += f.vz * dt; f.m.position.y = Math.max(.1, f.m.position.y + f.vy * dt); f.m.rotation.x += 6 * dt; f.sm.opacity = clamp(1 - f.t / f.life, 0, 1); if (f.t >= f.life) { HL.world.remove(f.m); this.fx.splice(i, 1); } }
    // net state at ~15 Hz
    if (this.online) { this.syncT -= dt; if (this.syncT <= 0 && Net.on) { this.syncT = .066; Net.send({ t: 's', x: +me.x.toFixed(2), z: +me.z.toFixed(2), a: +me.a.toFixed(3), vx: +me.vx.toFixed(1), vz: +me.vz.toFixed(1), hp: Math.round(me.hp), sh: Math.round(me.sh), al: me.alive ? 1 : 0 }); } }
    // tension from the nearest enemy, camera
    let nd = 99; this.ships.forEach(s => { if (s.team !== me.team && s.alive) nd = Math.min(nd, Math.hypot(s.x - me.x, s.z - me.z)); }); S.tension = clamp(1 - nd / 40, 0, 1) * .7;
    const lx = me.x + (this.aim.x - me.x) * .12, lz = me.z + (this.aim.z - me.z) * .12; this.cam.x = lerp(this.cam.x, lx, clamp(dt * 4, 0, 1)); this.cam.z = lerp(this.cam.z, lz, clamp(dt * 4, 0, 1));
    S.shake = Math.max(0, (S.shake || 0) - dt); HL.camera.position.set(this.cam.x + (Math.random() - .5) * S.shake, 46, this.cam.z + 17 + (Math.random() - .5) * S.shake); HL.camera.lookAt(this.cam.x, 0, this.cam.z); HL.camera.fov = 50; HL.camera.updateProjectionMatrix();
    this.hud();
  },
  msg(t, ms) { const el = $('nvMsg'); el.textContent = t; el.classList.add('on'); clearTimeout(this.msgT); if (ms) this.msgT = setTimeout(() => el.classList.remove('on'), ms); },
  feedAdd(t) { this.feed.unshift(t); this.feed.length = Math.min(this.feed.length, 6); $('nvFeed').innerHTML = this.feed.map(x => `<div>${x}</div>`).join(''); },
  hud() {
    const me = this.me; $('nvScore').innerHTML = `<span class="p">${FAC.pirate.name} ${this.scores.pirate}</span><small>first to ${LIMIT}${this.online ? ' · online' : ''}</small><span class="n">${this.scores.navy} ${FAC.navy.name}</span>`;
    $('nvHull').firstElementChild.style.width = clamp(me.hp, 0, 100) + '%'; $('nvSh').firstElementChild.style.width = clamp(me.sh / 60 * 100, 0, 100) + '%';
    const rd = (c, m) => c > 0 ? `${c.toFixed(1)}s` : 'READY';
    $('nvGuns').innerHTML = `PORT (Q) ${rd(me.cdL)} · STARBOARD (E) ${rd(me.cdR)}<br>BOOST ${me.boostCd > 0 ? me.boostCd.toFixed(0) + 's' : 'READY'} · SPEED ${Math.hypot(me.vx, me.vz).toFixed(0)}${me.board ? '<br>BOARDING ' + Math.round(me.board.t / 1.5 * 100) + '%' : this.ships.some(s => s.team !== me.team && s.alive && s.hp <= 25 && Math.hypot(s.x - me.x, s.z - me.z) < 8) ? '<br><b>HOLD F — BOARD THE WRECK</b>' : ''}`;
    const c = $('nvRadar').getContext('2d'); c.clearRect(0, 0, 150, 150); const k = 70 / ARENA, cx = 75, cz = 75;
    c.strokeStyle = '#ffffff22'; c.beginPath(); c.arc(cx, cz, 70, 0, 7); c.stroke(); c.fillStyle = '#ffffff33'; this.rocks.forEach(r => { c.beginPath(); c.arc(cx + r.x * k, cz + r.z * k, Math.max(1, r.r * k), 0, 7); c.fill(); });
    this.ships.forEach(s => { if (!s.alive) return; c.fillStyle = s === me ? '#fff' : s.team === 'pirate' ? '#ffa030' : '#6aff9a'; c.beginPath(); c.arc(cx + s.x * k, cz + s.z * k, s === me ? 3.5 : 2.6, 0, 7); c.fill(); });
  },
  endMatch() {
    if (this.ended) return; this.ended = true; this.playing = false; const win = this.scores[this.team] >= LIMIT, st = this.stats;
    const base = this.team === 'navy' ? 70 + st.kills * 30 : 50 + st.kills * 25 + st.boards * 60, pay = Math.max(20, Math.round(base + (win ? 100 : 0) - st.deaths * 10));
    S.carryMoney = (S.carryMoney || 0) + 0; this.pay = pay;
    $('nrT').textContent = win ? 'Contract won' : 'Contract lost'; $('nrB').innerHTML = `${FAC.pirate.name} ${this.scores.pirate} — ${this.scores.navy} ${FAC.navy.name}<br>Your kills ${st.kills} · boardings ${st.boards} · deaths ${st.deaths}<br><br>${this.team === 'navy' ? 'Concord mercenary pay' : 'Free Fleet salvage share'}: <b>${pay} ₵</b> for the family purse${this.online ? '' : ''}.`;
    Net.close(); res.classList.remove('hidden'); nav.classList.add('hidden'); this.paidOut = false;
  },
};
const keys = HL.keys;
chNaval.shellGeo = new T.SphereGeometry(.28, 6, 5); chNaval.shellMat = {};
HL.registerChapter('naval', chNaval);
HL.cleanups.push(i => { if (i !== HL.idx.naval) { nav.classList.add('hidden'); lobby.classList.add('hidden'); res.classList.add('hidden'); document.body.classList.remove('naval'); if (chNaval.mouseHandlers) { /* handlers stay; they check the chapter */ } Net.close(); chNaval.playing = false; } });

/* ───────────── wiring ───────────── */
function payout() { if (chNaval.paidOut || !chNaval.pay) return; chNaval.paidOut = true; if (HL.day && HL.day.D) HL.day.contract(chNaval.pay, 150); else S.carryMoney = (S.carryMoney || 0) + chNaval.pay; }
document.addEventListener('mousedown', e => { if (S.chapter === HL.idx.naval && e.button === 0 && chNaval.playing && e.target === HL.canvas) chNaval.mouseDown = true; });
document.addEventListener('mouseup', () => { chNaval.mouseDown = false; });
document.addEventListener('contextmenu', e => { if (S.chapter === HL.idx.naval) e.preventDefault(); });
document.addEventListener('keydown', e => { if (S.chapter === HL.idx.naval && e.code === 'Escape' && chNaval.playing) { S.paused = !S.paused; $('pause').classList.toggle('hidden', !S.paused); } });
lobby.querySelectorAll('[data-team]').forEach(b => b.addEventListener('click', () => { lobby.querySelectorAll('[data-team]').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); chNaval.team = b.dataset.team; }));
$('nvSolo').addEventListener('click', () => { A.init(); chNaval.start({ team: chNaval.team, name: $('nvName').value }); });
$('nvJoin').addEventListener('click', () => { A.init(); chNaval.start({ team: chNaval.team, name: $('nvName').value, online: true, url: $('nvUrl').value.trim(), room: ($('nvRoom').value || 'poors').trim() }); });
$('nvBack').addEventListener('click', () => { lobby.classList.add('hidden'); if (S.fromDay && HL.idx.day != null && S.dayStarted) HL.goChapter(HL.idx.day); else location.reload(); });
$('nrAgain').addEventListener('click', () => { payout(); chNaval.openLobby(); res.classList.add('hidden'); });
$('nrDay').addEventListener('click', () => { payout(); if (S.dayStarted && HL.idx.day != null) HL.goChapter(HL.idx.day); else location.reload(); });
$('nrMenu').addEventListener('click', () => { payout(); location.reload(); });
const pb = $('pirateBtn'); if (pb) pb.addEventListener('click', e => { e.stopPropagation(); S.fromDay = false; HL.startGame(HL.idx.pirate); });
const nb = $('navalBtn'); if (nb) nb.addEventListener('click', e => { e.stopPropagation(); HL.startGame(HL.idx.naval); });
HL.naval = { chPirate, chNaval, Net, FAC, begin(o) { chNaval.autostart = null; HL.goChapter(HL.idx.naval); } };
})();
