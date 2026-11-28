/* HOLLOW LULLABY — DAYTIME in the city of Poors, 2147.
   The Ressel family were engineers until the Automation Purge of 2131. Aurel plans one day at a time:
   jobs (low / medium / high), the bus, the pharmacy and the back alley, cooking, and the PCB and lathe benches.
   The money he is holding at 22:00 goes to the household screen (who gets oxygen, food, medicine). */
(() => {
'use strict';
const HL = window.HL, { S, A, T, clamp, rnd, pick } = HL, $ = HL.$;

/* ───────────── styles + DOM ───────────── */
const st = document.createElement('style');
st.textContent = `
#day{position:fixed;inset:0;z-index:4;display:flex;flex-direction:column;font-family:"Courier New",monospace;color:#e8dcc4;background:linear-gradient(#0000 0,#07050aee 38%);pointer-events:none}
#day.hidden,#mini.hidden{display:none}
#day>*{pointer-events:auto}
#dayTop{display:flex;gap:16px;flex-wrap:wrap;align-items:center;padding:8px 14px;background:#0a0709e6;border-bottom:1px solid #4a3a2c;font-size:12px;letter-spacing:.07em;text-transform:uppercase}
#dayTop b{color:#ffd890}.bar{display:inline-block;width:70px;height:6px;background:#ffffff1f;vertical-align:middle;margin-left:4px}.bar i{display:block;height:100%;background:#8ae08a}
#dayMain{flex:1;display:flex;gap:12px;padding:12px;min-height:0;overflow:auto;margin-top:auto;max-height:64vh}
#dayLoc{flex:1 1 520px;background:#120d10ee;border:1px solid #3a2c26;padding:12px 14px;min-width:0}
#dayLoc h2{margin:0 0 4px;font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#ffd890}
#dayLoc p{margin:0 0 10px;font-size:13px;opacity:.75;line-height:1.5;font-family:Georgia,serif;font-style:italic}
.act{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid #ffffff14;font-size:13px}
.act small{display:block;opacity:.6;font-size:11px;line-height:1.4}
.act button,.mbtn{font:inherit;font-size:12px;padding:7px 12px;border:1px solid #0008;background:#3f6a3a;color:#eef;cursor:pointer;text-transform:uppercase;letter-spacing:.07em}
.act button:disabled{background:#3a3430;color:#8a8070;cursor:not-allowed}
.act button.warn{background:#7a2a22}.act button.alt{background:#2f5a6a}
#daySide{flex:0 1 300px;display:flex;flex-direction:column;gap:10px;min-width:0}
#dayFam,#dayLog{background:#120d10ee;border:1px solid #3a2c26;padding:10px 12px;font-size:12px;line-height:1.55}
#dayLog{flex:1;overflow:auto;max-height:260px}#dayLog div{opacity:.75;margin-bottom:3px}#dayLog div:first-child{opacity:1;color:#ffd890}
#mini{position:fixed;inset:0;z-index:6;background:#000000b8;display:flex;align-items:center;justify-content:center;font-family:"Courier New",monospace;color:#e8dcc4}
#miniBox{background:#17110f;border:1px solid #6a5a44;padding:16px 18px;max-width:min(640px,96vw);max-height:94vh;overflow:auto;text-align:center}
#miniBox h3{margin:0 0 6px;letter-spacing:.14em;text-transform:uppercase;font-size:15px;color:#ffd890}
#miniBox p{font-size:12px;opacity:.75;margin:4px 0 10px;line-height:1.5}
.mrow{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:8px 0}
.mbtn.k{background:#2a2420;border-color:#6a5a44}
.item{font-size:22px;letter-spacing:.1em;padding:14px;background:#0b0809;margin:8px 0;border:1px solid #3a2c26;min-width:320px}
.tbar{height:6px;background:#ffffff1f;margin:6px 0}.tbar i{display:block;height:100%;background:#ffb040;width:100%}
.pcb{display:grid;gap:3px;justify-content:center;margin:10px auto}
.cell{width:44px;height:44px;background:#0e2a1c;border:1px solid #1c5a3a;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#041;user-select:none}
.cell.pad{border-radius:50%;border:3px solid #fff8}
#miniBox canvas#lathe{position:static;inset:auto;width:560px;height:230px;max-width:100%;display:block;margin:0 auto;background:#0c0a0b;border:1px solid #3a2c26;cursor:crosshair}
.sboard{display:flex;gap:14px;justify-content:center;margin:12px 0}
.spad{width:58px;height:58px;border-radius:50%;background:#b58a3a;border:3px solid #6a4a1a;position:relative;display:flex;align-items:center;justify-content:center;transition:box-shadow .1s}
.spad b{width:8px;height:34px;background:#8a8a90;border-radius:3px;display:block}
.spad.now{outline:3px solid #9fe0ff;outline-offset:3px}
.spad.good{background:radial-gradient(circle at 35% 30%,#fff,#c8d0d8 45%,#7a828c);border-color:#aab}
.spad.cold{background:radial-gradient(circle,#6a6a62,#4a4a44);border-color:#333;filter:contrast(1.2)}
.spad.burnt{background:#2a1a10;border-color:#000}
.spad.blob{background:radial-gradient(circle at 35% 30%,#fff,#aeb6be 50%,#6a727c);border-color:#aab;transform:scale(1.35)}
.sg{display:flex;gap:22px;align-items:center;justify-content:center}.sg .heat{width:40px;height:150px}.sg>div:last-child{min-width:220px;text-align:left}
.heat{width:46px;height:200px;background:#1a1210;border:1px solid #6a5a44;position:relative;margin:8px auto}
.heat .zone{position:absolute;left:0;right:0;background:#3f8a4a88;border-top:1px solid #9f9;border-bottom:1px solid #9f9}
.heat .fill{position:absolute;left:4px;right:4px;bottom:0;background:linear-gradient(#ff5a2a,#ffb040);}
body.day #dot,body.day #san,body.day #hint,body.day #prompt{display:none}
@media (max-width:760px){#dayMain{flex-direction:column}#daySide{flex:none}.cell{width:38px;height:38px}}
`;
document.head.appendChild(st);
const root = document.createElement('div'); root.id = 'day'; root.className = 'hidden';
root.innerHTML = '<div id="dayTop"></div><div id="dayMain"><div id="dayLoc"></div><div id="daySide"><div id="dayFam"></div><div id="dayLog"></div></div></div>';
document.body.appendChild(root);
const mini = document.createElement('div'); mini.id = 'mini'; mini.className = 'hidden'; mini.innerHTML = '<div id="miniBox"></div>'; document.body.appendChild(mini);

/* ───────────── world data ───────────── */
const LOCS = {
  home: { n: 'The Flat — Poors, Deck 14', p: [0, 0], d: 'Two rooms, one meter. Nora\'s plant drawings cover the wall where the window used to be. Ilse coughs in the next room, then pretends she did not.' },
  market: { n: 'Poors Market', p: [2, 1], d: 'Stalls bolted to the hull of an old freighter. Medicine behind glass at the front. Other things in the alley at the back.' },
  yard: { n: 'Scrap Yard — Low Deck', p: [-3, 1], d: 'Mountains of dead machines on the night side of the city. Everyone who lost an engineering licence in the Purge ends up here at least once.' },
  shop: { n: 'Brass Dock Workshop', p: [3, -2], d: 'Benches, a lathe older than the Concord, a soldering station with a flickering lamp. They hire by the order and pay by the part.' },
  docks: { n: 'Poors Free Docks', p: [-5, -3], d: 'Raider galleons and Navy lighters share the same berths and the same bars. A board with contracts: pirates pay in salvage, Concord pays in credits and fine print.' },
  tower: { n: 'Arasaka Tower — Turin (Engineering)', p: [6, 3], d: 'Torino Alta, on the light side: the old Intesa Sanpaolo skyscraper, rebuilt as the Arasaka Tower. Glass, clean air, and on the upper floors the Improvement Suites, where the rich of Turin buy new bodies. The only place where an engineer still counts as one. Licences are checked at the door.' },
};
const dist = (a, b) => Math.hypot(LOCS[a].p[0] - LOCS[b].p[0], LOCS[a].p[1] - LOCS[b].p[1]);
const busFare = (a, b) => Math.round(3 + dist(a, b) * 1.6), busTime = (a, b) => Math.round(8 + dist(a, b) * 6), walkTime = (a, b) => Math.round(10 + dist(a, b) * 16);
const fmt = t => String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0');
const lvlOf = xp => xp >= 9 ? 3 : xp >= 5 ? 2 : xp >= 2 ? 1 : 0;
const PRICES = { rice: 4, algae: 3, protein: 9 };
const RECIPES = [
  { id: 'rice', n: 'Synth-rice & algae', cost: { rice: 1, algae: 1 }, portions: 3, zone: [55, 72] },
  { id: 'stew', n: 'Vat-protein stew', cost: { rice: 1, protein: 1 }, portions: 4, zone: [62, 78] },
  { id: 'greens', n: 'Concord greens (free ration)', cost: {}, portions: 3, zone: [45, 60], eerie: true },
];
const BUS_LINES = ['4X', '9', '12-Night', '7B'];

/* ───────────── state ───────────── */
let D = null;
const SAVE = 'hl-save-v1';
function persist() { try { localStorage.setItem(SAVE, JSON.stringify({ xp: D.xp, parts: D.parts, n: D.n, pirate: !!S.pirateSeen, tut: !!(D && D.tut), implants: (D && D.implants) || [] })); } catch (e) { /* private mode */ } }
function newDay(n, keep) {
  const prev = keep || {};
  D = {
    n, t: 360, money: S.carryMoney != null ? S.carryMoney : 160, energy: 100, stress: 10, loc: 'home', tin: prev.tin || 40, tut: !!prev.tut, implants: prev.implants || [], stim: 0, hush: false,
    xp: prev.xp || { pcb: 0, lathe: 0 }, parts: prev.parts || { board: 0, barrel: 0 }, ing: prev.ing || { rice: 1, algae: 0, protein: 0 }, meals: 0, meds: { real: 0, fake: 0 }, chalk: false,
    strike: Math.random() < .4 ? [600 + ((Math.random() * 3) | 0) * 30, 780] : null, log: [], earned: 0, spent: 0, jobs: 0, ended: false,
  };
  if (n === 1 && !keep) { try { const sv = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (sv) { D.xp = sv.xp || D.xp; D.parts = sv.parts || D.parts; if (sv.pirate) S.pirateSeen = true; D.tut = !!sv.tut; D.implants = sv.implants || D.implants; } } catch (e) { /* ignore */ } }
  S.implants = D.implants; S.psyBase = D.implants.reduce((a, k) => a + ((HL.IMPLANTS || window.HLMaps.IMPLANTS)[k] || { psy: 0 }).psy, 0);
  S.day = D; log(`Day ${n}. 06:00. The meter is already running.`);
  if (D.strike) log(`Radio: transit workers threaten a strike around ${fmt(D.strike[0])}.`);
}
function log(m) { D.log.unshift(m); if (D.log.length > 40) D.log.pop(); }
const skill = k => lvlOf(D.xp[k]);
const spend = n => { D.money -= n; D.spent += n; };
const earn = n => { D.money += n; D.earned += n; };
function adv(min, energy = 0) {
  D.t += min; D.energy = clamp(D.energy - energy, 0, 100); D.stress = clamp(D.stress + min / 60 * 1.5, 0, 100);
  if (D.t >= 1320 && !D.ended) { D.ended = true; log('Curfew siren. The streets close at 22:00.'); render(); setTimeout(endDay, 900); }
}
const tired = (need = 15) => { if (D.energy < need) { log(`Too tired (${Math.round(D.energy)} energy). Eat, nap, or take something.`); render(); return true; } return false; };
const strikeNow = t => D.strike && t >= D.strike[0] && t < D.strike[1];

/* ───────────── bus / walking ───────────── */
function arrive(to) { if (to === 'shop' && !D.tut) log('Foreman: "PCB orders need a steady hand and a certificate. There is a free soldering tutorial at the bench."'); }
function ride(to) {
  const from = D.loc, dep = Math.ceil(D.t / 20) * 20;
  if (strikeNow(dep)) { log(`No buses: the strike runs until ${fmt(D.strike[1])}. Walk, or wait.`); return render(); }
  const fare = busFare(from, to); if (D.money < fare) { log(`The ${pick(BUS_LINES)} costs ${fare} ₵ and you have ${D.money.toFixed(0)}.`); return render(); }
  spend(fare); const wait = dep - D.t, line = pick(BUS_LINES);
  const ev = Math.random(); let extra = '';
  if (ev < .18) { spend(Math.min(5, D.money)); extra = ' A fare inspector fined you 5 ₵ for an unmetered cough.'; }
  else if (ev < .32) extra = ' Two Free Fleet gunners argue about a Navy contract. You listen.';
  else if (ev < .42) { D.stress = clamp(D.stress - 8, 0, 100); extra = ' A child hums the lullaby on the seat in front of you.'; }
  D.t = dep; log(`Waited ${wait} min for the ${line}, rode ${busTime(from, to)} min (${fare} ₵).${extra}`); D.loc = to; arrive(to); adv(busTime(from, to), 2);
  render();
}
function walk(to) { const m = walkTime(D.loc, to); log(`Walked ${m} min to ${LOCS[to].n}.`); D.loc = to; arrive(to); adv(m, m * .15); render(); }

/* ───────────── mini-game plumbing ───────────── */
let miniTimer = null, miniKey = null;
function miniOpen(html) { $('miniBox').innerHTML = html; mini.classList.remove('hidden'); }
function miniClose() { clearInterval(miniTimer); miniTimer = null; if (miniKey) { document.removeEventListener('keydown', miniKey, true); document.removeEventListener('keyup', miniKey, true); miniKey = null; } mini.classList.add('hidden'); }
function onKeys(fn) { if (miniKey) document.removeEventListener('keydown', miniKey, true); miniKey = e => { if (!mini.classList.contains('hidden')) { fn(e); if (/Digit|Space|Arrow|KeyW|KeyS|KeyF/.test(e.code)) e.stopPropagation(); } }; document.addEventListener('keydown', miniKey, true); document.addEventListener('keyup', miniKey, true); }

/* — low-level job: sort scrap — */
function gameSort(done) {
  const BINS = ['Copper', 'Plastic', 'Alloy', 'Bio'], POOL = [['COPPER WIRE', 0], ['COPPER BUSBAR', 0], ['PLASTIC SHELL', 1], ['PLASTIC REEL', 1], ['ALLOY PLATE', 2], ['ALLOY STRUT', 2], ['BIO — GLOVES ON', 3], ['BIO — DO NOT LOOK', 3]];
  let n = 0, right = 0, left = 10, cur = null; const total = 10;
  const draw = () => {
    miniOpen(`<h3>Scrap sorting</h3><p>Sort each piece into the right bin. 2.4 seconds each. Keys 1–4.</p><div class="item" id="sItem"></div><div class="tbar"><i id="sT"></i></div>
      <div class="mrow">${BINS.map((b, i) => `<button class="mbtn" data-b="${i}">${i + 1} · ${b}</button>`).join('')}</div><p id="sP">${n}/${total} · correct ${right}</p>`);
    $('miniBox').querySelectorAll('[data-b]').forEach(b => b.onclick = () => answer(+b.dataset.b));
  };
  const next = () => { if (n >= total) { miniClose(); return done({ score: right, total }); } cur = pick(POOL); left = 2.4; $('sItem').textContent = cur[0]; $('sP').textContent = `${n}/${total} · correct ${right}`; };
  const answer = i => { if (i === cur[1]) right++; else A.tone(160, .12, .06, 'square'); n++; next(); };
  draw(); next();
  miniTimer = setInterval(() => { left -= .05; $('sT').style.width = clamp(left / 2.4 * 100, 0, 100) + '%'; if (left <= 0) answer(-1); }, 50);
  onKeys(e => { if (e.type === 'keydown' && /^Digit[1-4]$/.test(e.code)) answer(+e.code.slice(5) - 1); });
}

/* — PCB routing — */
function genPCB(G, nets) {
  const nb = c => { const x = c % G, y = (c / G) | 0, r = []; if (x > 0) r.push(c - 1); if (x < G - 1) r.push(c + 1); if (y > 0) r.push(c - G); if (y < G - 1) r.push(c + G); return r; };
  for (let tries = 0; tries < 300; tries++) {
    const used = new Set(), out = []; let ok = true;
    for (let k = 0; k < nets && ok; k++) {
      let got = null;
      for (let t = 0; t < 60 && !got; t++) {
        const free = []; for (let c = 0; c < G * G; c++) if (!used.has(c)) free.push(c); if (!free.length) break;
        let p = [pick(free)]; const want = 4 + ((Math.random() * 4) | 0), mark = new Set(p);
        while (p.length < want) { const opts = nb(p[p.length - 1]).filter(c => !used.has(c) && !mark.has(c)); if (!opts.length) break; const c = pick(opts); p.push(c); mark.add(c); }
        if (p.length >= 4) got = p;
      }
      if (!got) ok = false; else { got.forEach(c => used.add(c)); out.push({ a: got[0], b: got[got.length - 1], path: got }); }
    }
    if (ok) return out;
  }
  return [{ a: 0, b: 5 }, { a: 6, b: 11 }, { a: 12, b: 17 }];
}
const NETCOL = ['#ffb040', '#40d0ff', '#ff6aa0', '#b4ff5a'];
function gamePCB(nets, secs, title, done, note) {
  const G = 6, puzzle = genPCB(G, nets), _lp = (HL.day && (HL.day.lastPuzzle = puzzle)), owner = Array(G * G).fill(-1), paths = puzzle.map(() => []), fin = puzzle.map(() => false); let cur = -1, left = secs;
  const padOf = c => puzzle.findIndex(n => n.a === c || n.b === c);
  const paint = () => {
    $('miniBox').querySelectorAll('.cell').forEach(el => {
      const c = +el.dataset.c, k = padOf(c), o = owner[c];
      el.style.background = o >= 0 ? NETCOL[o] + (fin[o] ? '' : 'aa') : '#0e2a1c'; el.style.borderColor = k >= 0 ? NETCOL[k] : '#1c5a3a'; el.textContent = k >= 0 ? 'ABCD'[k] : '';
    });
    $('pcbS').textContent = `${fin.filter(Boolean).length}/${nets} nets routed`;
  };
  miniOpen(`<h3>${title}</h3><p>Join each lettered pad to its twin with a trace. Click a pad, then adjacent cells. Traces may not cross. Click inside a trace to cut it back.</p>${note ? `<p style="color:#9fe0ff">${note}</p>` : ''}
    <div class="tbar"><i id="pT"></i></div><div class="pcb" style="grid-template-columns:repeat(${G},44px)">${Array.from({ length: G * G }, (_, c) => `<div class="cell ${padOf(c) >= 0 ? 'pad' : ''}" data-c="${c}"></div>`).join('')}</div><p id="pcbS"></p>
    <div class="mrow"><button class="mbtn k" id="pGive">Give up</button></div>`);
  const adj = (a, b) => Math.abs(a - b) === G || (Math.abs(a - b) === 1 && ((a / G) | 0) === ((b / G) | 0));
  const click = c => {
    const pk = padOf(c);
    if (pk >= 0 && !paths[pk].length) { cur = pk; paths[pk] = [c]; owner[c] = pk; }
    else if (pk >= 0 && paths[pk][0] === c && !fin[pk]) { paths[pk].forEach(x => owner[x] = -1); paths[pk] = []; cur = -1; }
    else if (pk >= 0 && fin[pk] && (puzzle[pk].a === c || puzzle[pk].b === c)) { paths[pk].forEach(x => owner[x] = -1); paths[pk] = []; fin[pk] = false; cur = -1; }
    else if (cur >= 0 && !fin[cur] && adj(paths[cur][paths[cur].length - 1], c)) {
      if (owner[c] < 0 && (pk < 0 || pk === cur)) {
        paths[cur].push(c); owner[c] = cur;
        const n = puzzle[cur], start = paths[cur][0], target = start === n.a ? n.b : n.a;
        if (c === target) { fin[cur] = true; A.tone(900, .1, .05, 'square'); cur = -1; }
      }
    } else if (owner[c] >= 0 && !fin[owner[c]]) { const k = owner[c], i = paths[k].indexOf(c); paths[k].slice(i + 1).forEach(x => owner[x] = -1); paths[k] = paths[k].slice(0, i + 1); cur = k; }
    paint();
    if (fin.every(Boolean)) { miniClose(); done({ ok: true, left, frac: left / secs }); }
  };
  $('miniBox').querySelectorAll('.cell').forEach(el => el.onclick = () => click(+el.dataset.c));
  $('pGive').onclick = () => { miniClose(); done({ ok: false, left: 0, frac: 0, partial: fin.filter(Boolean).length / nets }); };
  paint();
  miniTimer = setInterval(() => { left -= .1; $('pT').style.width = clamp(left / secs * 100, 0, 100) + '%'; if (left <= 0) { miniClose(); done({ ok: false, left: 0, frac: 0, partial: fin.filter(Boolean).length / nets }); } }, 100);
}

/* — lathe turning — */
function gameLathe(tol, title, done) {
  const N = 60, R0 = 20, target = 11 + ((Math.random() * 5) | 0) + .5, prof = Array(N).fill(R0); let pos = 0, running = false, passes = 0, toolR = 20, last = performance.now();
  miniOpen(`<h3>${title}</h3><p>Turn the shaft to <b>⌀ ${(target * 2).toFixed(1)} mm</b> (radius ${target}) ±${tol}. Move the mouse up/down (or W/S) to set the cutter. <b>Space</b> starts a pass. Cut too deep and the metal is gone. Two passes max.</p>
    <canvas id="lathe" width="560" height="230"></canvas><p id="lS"></p><div class="mrow"><button class="mbtn" id="lGo">Start pass (Space)</button><button class="mbtn k" id="lDone">Finish part</button></div>`);
  const cv = $('lathe'), g = cv.getContext('2d'), cy = 115, sc = 4.4;
  const start = () => { if (running || passes >= 2) return; running = true; pos = 0; };
  const stats = () => { let good = 0; prof.forEach(r => { if (Math.abs(r - target) <= tol) good++; }); return good / N; };
  const finish = () => { const q = stats(); miniClose(); done({ quality: q, ok: q >= .85, target }); };
  cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); toolR = clamp(Math.abs((e.clientY - r.top) * (230 / r.height) - cy) / sc, 6, 22); });
  $('lGo').onclick = start; $('lDone').onclick = () => { if (passes >= 1 || running) finish(); else $('lS').textContent = 'Make at least one pass first.'; };
  onKeys(e => { if (e.type !== 'keydown') return; if (e.code === 'Space') start(); if (e.code === 'KeyW') toolR = clamp(toolR + .3, 6, 22); if (e.code === 'KeyS') toolR = clamp(toolR - .3, 6, 22); });
  miniTimer = setInterval(() => {
    const now = performance.now(), dt = Math.min(.06, (now - last) / 1000); last = now;
    if (running) { const np = pos + 15 * dt; for (let i = Math.floor(pos); i < Math.min(N, Math.floor(np) + 1); i++) prof[i] = Math.min(prof[i], toolR); pos = np; if (pos >= N) { running = false; passes++; A.burst(900, 2, .15, .1); if (passes >= 2) setTimeout(() => { if (!mini.classList.contains('hidden')) finish(); }, 400); } }
    g.fillStyle = '#0c0a0b'; g.fillRect(0, 0, 560, 230); const w = 560 / N;
    g.fillStyle = '#ffffff10'; g.fillRect(0, cy - (target + tol) * sc, 560, tol * 2 * sc);
    prof.forEach((r, i) => { const bad = r < target - tol, ok = Math.abs(r - target) <= tol; g.fillStyle = bad ? '#7a2a22' : ok ? '#8ac0a0' : '#8a8a90'; g.fillRect(i * w, cy - r * sc, w + 1, r * 2 * sc); });
    g.strokeStyle = '#ffb04088'; g.setLineDash([6, 4]); [-1, 1].forEach(s => { g.beginPath(); g.moveTo(0, cy + s * target * sc); g.lineTo(560, cy + s * target * sc); g.stroke(); }); g.setLineDash([]);
    const tx = running ? pos * w : 0; g.fillStyle = '#ffd890'; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(tx, cy + s * toolR * sc); g.lineTo(tx - 12, cy + s * (toolR * sc + 16)); g.lineTo(tx + 12, cy + s * (toolR * sc + 16)); g.fill(); });
    $('lS').textContent = `Cutter radius ${toolR.toFixed(1)} · target ${target} ±${tol} · passes ${passes}/2 · in tolerance ${(stats() * 100).toFixed(0)}%`;
  }, 33);
}


/* — soldering: heat the pad, feed the solder, release — */
function gameSolder(n, o, done) {
  o = o || {}; const pads = Array.from({ length: n }, () => 'idle'), BAND = [50, 80], res = [];
  let k = 0, temp = 20, flow = 0, cold = 0, burn = 0, heat = false, feed = false, fed = false, locked = false;
  miniOpen(`<h3>${o.title || 'Soldering'}</h3><p id="slC">${o.coach ? '' : 'Heat each pad, feed solder, release. Shiny and cone-shaped is good.'}</p>
    <div class="sboard">${pads.map((_, i) => `<div class="spad" data-i="${i}"><b></b></div>`).join('')}</div>
    <div class="sg"><div class="heat"><div class="zone" style="bottom:${BAND[0]}%;height:${BAND[1] - BAND[0]}%"></div><div class="fill" id="sF"></div></div>
      <div><div class="tbar"><i id="sFlow" style="background:#c8d8e8;width:0"></i></div><small>solder flow</small><p id="sS" style="margin-top:10px"></p></div></div>
    <div class="mrow"><button class="mbtn" id="sHeat">Iron on pad (hold Space)</button><button class="mbtn" id="sFeed" style="background:#2f5a6a">Feed solder (hold F)</button></div>`);
  const pe = () => [...$('miniBox').querySelectorAll('.spad')];
  const hb = $('sHeat'), fb = $('sFeed'); hb.onmousedown = () => heat = true; hb.onmouseup = hb.onmouseleave = () => heat = false; fb.onmousedown = () => feed = true; fb.onmouseup = fb.onmouseleave = () => feed = false;
  hb.ontouchstart = () => heat = true; hb.ontouchend = () => heat = false; fb.ontouchstart = () => feed = true; fb.ontouchend = () => feed = false;
  onKeys(e => { const d = e.type === 'keydown'; if (e.code === 'Space') heat = d; if (e.code === 'KeyF') feed = d; });
  const MSG = { good: 'Shiny, concave fillet: a good joint.', cold: 'Cold joint: dull and grainy. It will crack in the field.', burnt: 'Burnt pad: the copper lifted. Too much heat for too long.', blob: 'Too much solder: a blob that can bridge to the next pad.' };
  const coach = () => {
    if (locked) return null;
    if (temp > 90) return 'TOO HOT: the flux burns off and the pad can lift. Release SPACE!';
    if (feed && temp < BAND[0]) return 'Cold joint! Solder on an unheated pad balls up. Release F and heat the pad first.';
    if (flow >= 1) return 'Enough. Release F: remove the solder first, then the iron.';
    if (!heat && temp < 24 && flow === 0) return 'Hold SPACE: touch the iron to the pad AND the component lead at the same time.';
    if (heat && temp < BAND[0]) return 'Heating... wait until the gauge reaches the green band. The pad must melt the solder, not the iron tip.';
    if (temp > BAND[1]) return 'Getting hot. Release SPACE for a moment.';
    if (flow < .05) return 'In the band. Now hold F: feed the wire onto the joint, never onto the iron tip.';
    return 'Flowing. Keep the pad in the green band (tap SPACE to hold the heat) until the flow bar fills.';
  };
  const finish = () => {
    locked = true; const kind = burn >= 1.2 ? 'burnt' : flow >= 1.35 ? 'blob' : (cold >= .5 || flow < 1) ? 'cold' : 'good'; res.push(kind); pads[k] = kind; pe()[k].className = 'spad ' + kind; pe()[k].style.boxShadow = '';
    $('slC').textContent = MSG[kind]; A.tone(kind === 'good' ? 1100 : 180, .12, .06, kind === 'good' ? 'triangle' : 'square');
    setTimeout(() => { if (mini.classList.contains('hidden')) return; k++; if (k >= n) { miniClose(); done({ n, good: res.filter(x => x === 'good').length, results: res }); return; } temp = 20; flow = cold = burn = 0; fed = false; locked = false; pe()[k].classList.add('now'); }, 900);
  };
  pe()[0].classList.add('now');
  miniTimer = setInterval(() => {
    const dt = .05; if (locked) return;
    temp = clamp(temp + (heat ? 34 : -16) * dt - (feed && !heat ? 4 * dt : 0), 15, 100);
    if (heat && temp > 90) burn += dt;
    if (feed) { fed = true; if (temp < BAND[0]) cold += dt; else if (temp > 90) burn += dt; else flow += dt; }
    if (burn >= 1.2 || flow >= 1.5 || (flow >= 1 && !feed) || (fed && !feed && ((flow > .15 && flow < 1) || cold >= .5))) finish();
    const el = pe()[k]; if (el && !locked) el.style.boxShadow = `0 0 ${(temp / 3).toFixed(0)}px rgba(255,${Math.round(150 - temp)},40,${(temp / 110).toFixed(2)})`;
    $('sF').style.height = temp + '%'; $('sFlow').style.width = clamp(flow / 1 * 100, 0, 100) + '%';
    $('sS').textContent = `pad ${Math.min(k + 1, n)}/${n} · ${Math.round(temp * 3.4 + 20)} °C pad · good so far ${res.filter(x => x === 'good').length}/${res.length}`;
    if (o.coach) { const c = coach(); if (c) $('slC').textContent = c; }
    HL.day.sol = { temp, flow, cold, burn, k, heat, feed, locked };
  }, 50);
}

/* — the bench tutorial: PCB routing + soldering, ends in an exam and a certificate — */
function lessonCard(title, html, btn, cb) { miniOpen(`<h3>${title}</h3>${html}<div class="mrow"><button class="mbtn" id="lsNext">${btn}</button><button class="mbtn k" id="lsQuit">Leave tutorial</button></div>`); $('lsNext').onclick = cb; $('lsQuit').onclick = () => { miniClose(); render(); }; }
function lessonSolder() {
  const step0 = () => lessonCard('Bench basics: PCB & soldering', `<p style="text-align:left">A <b>printed circuit board</b> is fibreglass with copper <b>traces</b> that connect parts. <b>Soldering</b> fuses each part's lead to a copper <b>pad</b> so current can flow. You will learn four things:</p>
    <p style="text-align:left">1. Route a trace without a short circuit.<br>2. The five rules of a good solder joint.<br>3. Practice on one joint, then a row of pins, with the foreman's hints.<br>4. An exam: route a board and solder it without hints. Pass it for your <b>Bench Basic certificate</b> (PCB level 1: you can take PCB orders).</p>
    <p style="text-align:left;color:#ffb860">Safety: the iron is ~330–350 °C. Work with ventilation: solder fumes (flux) are harmful. Lead-free solder melts at about 217 °C.</p>`, 'Start lesson 1', step1);
  const step1 = () => gamePCB(1, 90, 'Lesson 1/4 — route a trace', r => r.ok ? step2() : lessonCard('Not connected', '<p>The trace has to reach its twin pad without crossing anything. Try again.</p>', 'Retry', step1), 'A trace is a copper path. Click pad A, then step through adjacent cells to the other A. Two traces that touch would be a short circuit, which is why they may not cross.');
  const step2 = () => lessonCard('Lesson 2/4 — the five rules of a good joint', `<p style="text-align:left"><b>1. Prepare.</b> Clean the tip on brass wool; use flux or flux-core solder.<br><b>2. Heat both.</b> Touch the iron to the pad <i>and</i> the lead together for about 2–3 s.<br><b>3. Feed the joint.</b> Touch the solder wire to the heated joint, not to the iron tip.<br><b>4. Remove in order.</b> Solder away first, then the iron. Do not move the part while it cools.<br><b>5. Inspect.</b> Shiny, concave cone = good. <b>Dull and grainy</b> = cold joint (too cool). <b>Blob</b> = too much solder, risk of a bridge. <b>Black or lifted pad</b> = too hot for too long.</p>
    <p>In the game: <b>hold SPACE</b> to heat, keep the gauge in the green band, <b>hold F</b> to feed, and release F when the flow bar is full.</p>`, 'Practice one joint', step3);
  const step3 = () => gameSolder(1, { coach: true, title: 'Lesson 3/4 — your first joint (hints on)' }, r => r.good >= 1 ? step4() : lessonCard('That joint would fail', '<p>Read the hints under the title and try again. Heat first, then feed, then release.</p>', 'Try again', step3));
  const step4 = () => gameSolder(4, { coach: true, title: 'Lesson 3/4 — a row of four pins (hints on)' }, r => r.good >= 3 ? lessonCard('Well done', `<p>${r.good}/4 good joints. Now the exam: you will route a small board and solder it with no hints. You need 3 good joints out of 4.</p>`, 'Start the exam', step5) : lessonCard('Not yet', `<p>${r.good}/4 good joints. You need 3. One more try.</p>`, 'Try again', step4));
  const step5 = () => gamePCB(2, 60, 'Exam 4/4 — route the board', r => r.ok ? gameSolder(4, { coach: false, title: 'Exam — solder the board (no hints)' }, s => s.good >= 3 ? cert(s) : lessonCard('Exam failed', `<p>${s.good}/4 good joints. You need 3. A cold joint is the worst kind: it passes the bench test and fails in the field.</p>`, 'Retake the exam', step5)) : lessonCard('Exam failed', '<p>The board was not fully routed in time.</p>', 'Retake the exam', step5), 'Exam: no hints.');
  const cert = s => {
    adv(75, 8); const first = !D.tut; if (first) { D.tut = true; D.xp.pcb += 2; }
    log(first ? `Bench Basic certificate earned (${s.good}/4 good joints). PCB is now level ${skill('pcb')}: the foreman will give you PCB orders.` : `Repeated the bench exam: ${s.good}/4 good joints.`); persist();
    lessonCard('Certificate: Bench Basic', `<p style="font-size:14px">Awarded to <b>A. Ressel</b>, engineer (licence revoked 2131).<br>${s.good}/4 joints inspected: <b>good</b>.</p><p>${first ? '+2 PCB XP: PCB level 1 unlocked. PCB repair orders now pay for routing <i>and</i> for solder quality.' : 'No extra XP for repeating the exam.'}</p>`, 'Back to the bench', () => { miniClose(); render(); });
  };
  step0();
}

/* — cooking: keep the pot in the green — */
function gameCook(rec, done) {
  let T0 = 20, held = false, left = 12, inz = 0; const [lo, hi] = rec.zone;
  miniOpen(`<h3>${rec.n}</h3><p>Hold <b>Space</b> (or the button) to heat; release to let it cool. Keep the pot inside the green band for as long as you can.</p>
    <div class="heat"><div class="zone" style="bottom:${lo}%;height:${hi - lo}%"></div><div class="fill" id="hF"></div></div><div class="tbar"><i id="hT"></i></div><p id="hS"></p>
    <div class="mrow"><button class="mbtn" id="hBtn">Hold to heat</button></div>`);
  const b = $('hBtn'); b.onmousedown = () => held = true; b.onmouseup = b.onmouseleave = () => held = false; b.ontouchstart = () => held = true; b.ontouchend = () => held = false;
  onKeys(e => { if (e.code === 'Space') held = e.type === 'keydown'; });
  miniTimer = setInterval(() => {
    T0 = clamp(T0 + (held ? 34 : -15) * .05, 0, 100); left -= .05; if (T0 >= lo && T0 <= hi) inz += .05;
    $('hF').style.height = T0 + '%'; $('hT').style.width = (left / 12 * 100) + '%'; $('hS').textContent = `in the green: ${inz.toFixed(1)} s / 12`;
    if (left <= 0) { miniClose(); done({ quality: inz / 12 }); }
  }, 50);
}

/* ───────────── activities ───────────── */
const act = (title, sub, label, fn, opt = {}) => ({ title, sub, label, fn, ...opt });
function jobSort() {
  if (tired(24)) return; gameSort(r => {
    const pay = Math.round(35 + r.score * 6.5); earn(pay); D.jobs++; adv(180, 24); log(`Scrap Yard: sorted ${r.score}/${r.total} correctly. Paid ${pay} ₵. One of the bio crates was warm.`);
    if (r.score >= 9) { D.xp.lathe += 0; } render();
  });
}
function benchLathe(kind) {
  if (tired(15)) return; const tol = kind === 'high' ? .25 : kind === 'practice' ? .6 : .4;
  gameLathe(tol, kind === 'practice' ? 'Lathe — practice' : 'Lathe — order #' + (100 + ((Math.random() * 800) | 0)), r => {
    adv(kind === 'practice' ? 60 : 90, 12);
    if (kind === 'practice') { spend(Math.min(D.money, 6)); D.xp.lathe += r.ok ? 1 : .5; log(`Lathe practice: ${(r.quality * 100).toFixed(0)}% in tolerance (−6 ₵ stock).`); }
    else if (r.ok) { const pay = Math.round(40 + r.quality * 40); earn(pay); D.jobs++; D.xp.lathe += r.quality > .95 ? 2 : 1; if (Math.random() < .5) { D.parts.barrel++; log(`Lathe order done: ${pay} ₵. The foreman lets you keep a spare barrel blank. (+1 barrel)`); } else log(`Lathe order done: ${pay} ₵.`); }
    else log(`Lathe order rejected (${(r.quality * 100).toFixed(0)}% in tolerance). No pay.`);
    persist(); render();
  });
}
function benchPCB(kind) {
  if (tired(15)) return; const nets = kind === 'practice' ? 3 : kind === 'high' ? 4 : 3 + (skill('pcb') >= 2 ? 1 : 0), practice = kind === 'practice';
  gamePCB(nets, practice ? 70 : 55, practice ? 'PCB — practice' : 'PCB repair — rush job', r => {
    if (!r.ok) { adv(practice ? 60 : 90, 12); if (practice) { spend(Math.min(D.money, 6)); D.xp.pcb += .5; log('PCB practice: ran out of time. (−6 ₵ boards)'); } else log(`PCB order failed (${Math.round((r.partial || 0) * 100)}% routed). No pay.`); persist(); return render(); }
    gameSolder(practice ? 2 : 3, { coach: practice && !D.tut, title: practice ? 'PCB practice — solder the joints' : 'PCB repair — solder the joints' }, sol => {
      adv(practice ? 60 : 90, 12); const q = sol.good / sol.n, tag = `${sol.good}/${sol.n} good joints`;
      if (practice) { spend(Math.min(D.money, 6)); D.xp.pcb += q >= .5 ? 1 : .5; log(`PCB practice: clean routing, ${tag}. (−6 ₵ boards)`); }
      else {
        const pay = Math.round((55 + r.frac * 40) * (.55 + .45 * q)); earn(pay); D.jobs++; D.xp.pcb += q < .5 ? 0 : r.frac > .5 ? 2 : 1;
        const bad = sol.n - sol.good, why = bad ? ` ${bad} bad joint${bad > 1 ? 's' : ''} cost you ${Math.round((55 + r.frac * 40) - pay)} ₵.` : '';
        if (Math.random() < .55 && q >= .5) { D.parts.board++; log(`PCB order done: ${pay} ₵ (${tag}).${why} A spare fire-control board is yours. (+1 board)`); } else log(`PCB order done: ${pay} ₵ (${tag}).${why}`);
        if (!D.tut && bad) log('Foreman: "Sloppy joints. There is a free soldering tutorial at the bench."');
      }
      persist(); render();
    });
  });
}
function jobHigh() {
  if (tired(30)) return;
  gameLathe(.25, 'Arasaka contract 1/2 — precision shaft', a => {
    const conclude = b => {
      adv(240, 30); const score = (a.ok ? 1 : 0) + (b.ok ? 1 : 0), base = [0, 110, 360][score], pay = Math.round(base * .5);
      if (score) { earn(pay); D.jobs++; D.xp.pcb += score; D.xp.lathe += score; } if (score === 2) D.parts.board++, D.parts.barrel++;
      log(`Arasaka Tower: ${score}/2 specs passed${b.note || ''}. Paid ${pay} ₵ (${base} ₵ contract at 50%: your engineering licence was revoked in the 2131 Purge, so they classify you as a "consultant").${score === 2 ? ' (+1 board, +1 barrel)' : ''}`);
      persist(); render();
    };
    gamePCB(4, 50, 'Arasaka contract 2/2 — controller board', b => {
      if (!b.ok) return conclude(b);
      gameSolder(4, { coach: false, title: 'Arasaka contract — solder the controller board' }, sol => { b.ok = sol.good >= 3; b.note = ` (${sol.good}/4 joints good)`; conclude(b); });
    });
  });
}
function cook(rec) {
  const need = rec.cost; for (const k in need) if ((D.ing[k] || 0) < need[k]) { log(`Missing ${k} for ${rec.n}. The market sells it.`); return render(); }
  if (tired(8)) return;
  gameCook(rec, r => {
    for (const k in need) D.ing[k] -= need[k]; adv(45, 8);
    const portions = r.quality < .2 ? 1 : Math.max(1, Math.round(rec.portions * (.4 + .6 * r.quality))); D.meals += portions; D.energy = clamp(D.energy + 6, 0, 100);
    log(`${r.quality < .2 ? 'Burnt.' : r.quality > .75 ? 'Perfect.' : 'Edible.'} ${rec.n}: ${portions} portions (${(r.quality * 100).toFixed(0)}% in the green).${rec.eerie ? ' It tastes like someone else\'s garden. Your ears ring a little.' : ''}`);
    if (rec.eerie) { D.tin = clamp(D.tin + 8, 0, 100); S.ring = Math.max(S.ring, .012); } render();
  });
}
function buy(what) {
  const P = { med: [30, 'Lung medicine (licensed): Ilse\'s dose for today.', () => { D.meds.real++; }], fake: [15, 'Counterfeit lung medicine from the alley: half price, no guarantees.', () => { D.meds.fake++; if (Math.random() < .4) D.chalk = true; }],
    drops: [25, 'Tinnitus drops. The ringing softens for a night.', () => { D.tin = clamp(D.tin - 30, 0, 100); }],
    stim: [15, '"Wake" tablet: energy now, a bill later.', () => { D.energy = clamp(D.energy + 40, 0, 100); D.stress = clamp(D.stress + 10, 0, 100); D.stim++; }],
    hush: [18, '"Hush": a heavy, dreamless night. You will not hear the echoes.', () => { D.hush = true; D.stress = clamp(D.stress - 30, 0, 100); }] }[what];
  if (D.money < P[0]) { log(`Not enough: ${P[0]} ₵.`); return render(); }
  spend(P[0]); P[2](); adv(10); log(P[1]); render();
}
function install(k) {
  const v = window.HLMaps.IMPLANTS[k]; if (D.implants.includes(k)) return; if (D.money < v.cost) { log(`The ripperdoc wants ${v.cost} ₵ for the ${v.name}.`); return render(); }
  spend(v.cost); D.implants.push(k); S.implants = D.implants; S.psyBase = D.implants.reduce((a, q) => a + window.HLMaps.IMPLANTS[q].psy, 0); D.tin = clamp(D.tin + 8, 0, 100); adv(45, 10); S.ring = Math.max(S.ring, .015);
  log(`Installed: ${v.name}. The ripperdoc does not meet your eyes. Cyberpsychosis baseline is now ${S.psyBase}%.`); persist(); render();
}
function buyIng(k) { if (D.money < PRICES[k]) { log('Not enough credits.'); return render(); } spend(PRICES[k]); D.ing[k]++; adv(5); log(`Bought ${k} (${PRICES[k]} ₵).`); render(); }
function sellPart(k) { if (!D.parts[k]) return; D.parts[k]--; const v = k === 'board' ? 38 : 30; earn(v); adv(5); log(`Sold a ${k} for ${v} ₵ (it would have upgraded your ship).`); persist(); render(); }
function nap() { adv(60); D.energy = clamp(D.energy + 28, 0, 100); D.stress = clamp(D.stress - 8, 0, 100); log('You lie down for an hour. The meter ticks through the wall.'); render(); }

function actions() {
  const L = D.loc, a = [];
  const bus = to => to !== L && act(`Bus to ${LOCS[to].n}`, `${busFare(L, to)} ₵ · ${busTime(L, to)} min · next departure ${fmt(Math.ceil(D.t / 20) * 20)}${strikeNow(Math.ceil(D.t / 20) * 20) ? ' — STRIKE, no service' : ''}`, 'Ride', () => ride(to), { disabled: strikeNow(Math.ceil(D.t / 20) * 20) });
  const walkTo = to => to !== L && act(`Walk to ${LOCS[to].n}`, `free · ${walkTime(L, to)} min · tires you out`, 'Walk', () => walk(to), { cls: 'alt' });
  if (L === 'home') {
    a.push(...RECIPES.map(r => { const ok = Object.keys(r.cost).every(k => (D.ing[k] || 0) >= r.cost[k]); return act(`Cook: ${r.n}`, `${Object.keys(r.cost).map(k => k + ' ×' + r.cost[k]).join(', ') || 'no ingredients'} · ${r.portions} portions · 45 min${ok ? '' : ' · missing ingredients'}`, 'Cook', () => cook(r), { disabled: !ok }); }));
    a.push(act('Nap', '+28 energy, 1 hour', 'Lie down', nap));
    a.push(act('End the day', `Go to the household table. Meals ready: ${D.meals}.`, 'Evening', () => { if (!D.ended) { D.ended = true; endDay(); } }, { cls: 'warn' }));
  }
  if (L === 'market') {
    a.push(act('Pharmacy: lung medicine', '30 ₵ · a day\'s dose for Ilse, licensed, sealed', 'Buy', () => buy('med')), act('Pharmacy: tinnitus drops', '25 ₵ · eases the ringing tonight', 'Buy', () => buy('drops')));
    a.push(act('Alley dealer: "counterfeit" lung medicine', '15 ₵ · 40% chance it is chalk', 'Buy', () => buy('fake'), { cls: 'warn' }), act('Alley dealer: Wake (stimulant)', '15 ₵ · +40 energy now; sleep suffers; ringing rises', 'Buy', () => buy('stim'), { cls: 'warn' }), act('Alley dealer: Hush (sedative)', '18 ₵ · dreamless night: no echoes', 'Buy', () => buy('hush'), { cls: 'warn' }));
    Object.entries(window.HLMaps.IMPLANTS).forEach(([k, v]) => { const have = D.implants.includes(k); a.push(act(`Ripperdoc: ${v.name}`, `${v.cost} ₵ · +${v.psy}% cyberpsychosis · ${v.desc}${have ? ' · INSTALLED' : ''}`, have ? 'Installed' : 'Install', () => install(k), { disabled: have, cls: 'warn' })); });
    Object.keys(PRICES).forEach(k => a.push(act(`Ingredients: ${k}`, `${PRICES[k]} ₵ · you have ${D.ing[k] || 0}`, 'Buy', () => buyIng(k))));
    ['board', 'barrel'].forEach(k => a.push(act(`Sell a ${k}`, `${k === 'board' ? 38 : 30} ₵ · you have ${D.parts[k]} (or keep it for your ship)`, 'Sell', () => sellPart(k), { disabled: !D.parts[k] })));
  }
  if (L === 'docks') a.push(act('MERCENARY CONTRACT: Void skirmish', `~2.5 h · fight for the Free Fleet or take Concord Navy pay · your ship has ${D.parts.barrel} barrel(s), ${D.parts.board} board(s) · −25 energy`, 'Take contract', () => { if (tired(25)) return; HL.naval.begin(); }, { cls: 'warn' }));
  if (L === 'yard') a.push(act('LOW-LEVEL JOB: Scrap sorting', '3 h · ~35–100 ₵ · no skills needed · −24 energy', 'Work shift', jobSort));
  if (L === 'shop') {
    a.push(act('MEDIUM JOB: Lathe order', `1.5 h · 40–80 ₵ + spare barrel · needs Lathe L1 (you: L${skill('lathe')})`, 'Take order', () => benchLathe('mid'), { disabled: skill('lathe') < 1 }));
    a.push(act('MEDIUM JOB: PCB repair', `1.5 h · 55–95 ₵ + spare board · needs PCB L1 (you: L${skill('pcb')})`, 'Take order', () => benchPCB('mid'), { disabled: skill('pcb') < 1 }));
    a.push(act('TUTORIAL: PCB & soldering bench basics', D.tut ? 'Completed. Repeat for practice (75 min, no extra XP).' : 'free · 75 min · route a trace, learn the five soldering rules, pass the exam. Unlocks PCB level 1.', D.tut ? 'Repeat' : 'Start lesson', lessonSolder, { cls: 'alt' }));
    a.push(act('Practice at the lathe', '1 h · −6 ₵ stock · trains Lathe', 'Practice', () => benchLathe('practice')), act('Practice at the PCB bench', '1 h · −6 ₵ boards · trains PCB', 'Practice', () => benchPCB('practice')));
  }
  if (L === 'tower') a.push(act('RESISTANCE CONTRACT: raid the Arasaka Tower', `~3 h · 4 floors, Hotline-style: guards with vision cones and ears, doors, executions · you can use only the ${D.implants.length} improvement(s) installed at the ripperdoc · pays by score · −30 energy`, 'Take the raid', () => { if (tired(30)) return; HL.goChapter(HL.idx.hotline); }, { cls: 'warn' }));
  if (L === 'tower') a.push(act('HIGH-LEVEL JOB: Arasaka engineering contract', `4 h · lathe + PCB specs · up to 180 ₵ (50% — no licence) + parts · needs L2 in both (you: PCB L${skill('pcb')}, Lathe L${skill('lathe')})`, 'Take contract', jobHigh, { disabled: skill('pcb') < 2 || skill('lathe') < 2 }));
  Object.keys(LOCS).forEach(k => { if (k !== L) { a.push(bus(k)); a.push(walkTo(k)); } });
  return a.filter(Boolean);
}

/* ───────────── rendering ───────────── */
function render() {
  if (!D) return;
  const L = LOCS[D.loc];
  $('dayTop').innerHTML = `<span>Poors · Fool Night belt</span><span>Day <b>${D.n}</b> · 14.03.2147</span><span><b>${fmt(D.t)}</b></span><span>₵ <b>${D.money.toFixed(0)}</b></span>
    <span>Energy <span class="bar"><i style="width:${D.energy}%"></i></span></span><span>Stress <span class="bar"><i style="width:${D.stress}%;background:#e8a060"></i></span></span>
    <span>PCB L${skill('pcb')} · Lathe L${skill('lathe')}</span><span>Boards ${D.parts.board} · Barrels ${D.parts.barrel}</span>${D.strike ? `<span style="color:#ff9a6a">Strike ${fmt(D.strike[0])}–${fmt(D.strike[1])}</span>` : ''}`;
  const acts = actions();
  $('dayLoc').innerHTML = `<h2>${L.n}</h2><p>${L.d}</p>` + acts.map((x, i) => `<div class="act"><div>${x.title}<small>${x.sub}</small></div><button data-a="${i}" class="${x.cls || ''}" ${x.disabled ? 'disabled' : ''}>${x.label}</button></div>`).join('');
  $('dayLoc').querySelectorAll('[data-a]').forEach(b => b.onclick = () => { if (D.ended) return; A.burst(1800, 3, .04, .08); acts[+b.dataset.a].fn(); });
  const fed = D.meals;
  $('dayFam').innerHTML = `<b>Household tonight</b><br>Ilse (lungs): ${D.meds.real ? 'medicine ✓' : D.meds.fake ? 'counterfeit medicine ?' : 'no medicine ✗'}<br>Nora (9): food ${fed >= 1 ? '✓' : '✗'}<br>Meals cooked: ${D.meals} · Ingredients: rice ${D.ing.rice} algae ${D.ing.algae} protein ${D.ing.protein}<br>Tinnitus ${Math.round(D.tin)}% · stimulants today ${D.stim}`;
  $('dayLog').innerHTML = D.log.map(m => `<div>${m}</div>`).join('');
}

/* ───────────── end of day → household table → night ───────────── */
function endDay() {
  miniClose(); S.noEchoes = D.hush; S.stim = D.stim; S.tinnitus = D.tin; S.fakeMed = D.chalk && D.meds.real === 0 && D.meds.fake > 0;
  const order = ['nora', 'ilse', 'aurel'], free = { food: new Set(order.slice(0, Math.min(3, D.meals))), med: D.meds.real > 0 || D.meds.fake > 0 };
  const rate = 11 + D.n * 1.2 + (strikeNow(D.t) ? 0 : 0);
  $('day').classList.add('hidden');
  HL.chOffice.beginHouse({ title: `Day ${D.n} — the household table`, wage: Math.max(0, D.money), savings: 0, rate, free, scale: .25,
    summary: `Earned <b>${D.earned.toFixed(0)} ₵</b> · spent on the day <b>${D.spent.toFixed(0)} ₵</b> · holding <b>${D.money.toFixed(0)} ₵</b><br>Tonight's table is one day of the family's weekly costs (a quarter of a week).<br>Oxygen rate today <b>${rate.toFixed(1)} ₵/L</b> (inflation adjustment) · meals cooked ${D.meals} (food costs nothing for those fed) · medicine ${free.med ? 'already bought' : 'not bought'}<br>${S.fakeMed ? '<i>The alley medicine looks like chalk.</i>' : ''}`,
    after: () => nightAfter(),
  });
}
function nightAfter() {
  const keep = { implants: D.implants, tut: D.tut, xp: D.xp, parts: D.parts, ing: D.ing, tin: Math.max(0, D.tin - 5) }; persist();
  S.fromDay = true; const n = D.n + 1; S.nextDay = { n, keep }; S.family && (S.family.fakeMed = S.fakeMed);
  HL.goChapter(S.pirateSeen ? 2 : HL.idx.pirate); HL.lockPointer();
  S.sanity = clamp(.92 - (S.stim || 0) * .08 - (S.tinnitus || 0) / 400 - (S.psyBase || 0) / 300, .3, 1); S.ring = Math.max(S.ring, (S.stim || 0) * .01);
}

/* ───────────── the Day chapter (3D backdrop: the skyline of Poors on the terminator) ───────────── */
const chDay = {
  name: ['Daytime', 'Poors, 2147'], combat: true,
  build() {
    S.uiMode = true; S.flashlightOn = false; try { document.exitPointerLock(); } catch (e) { /* ignore */ }
    $('sub').classList.remove('on'); document.body.classList.add('combat', 'day'); HL.scene.fog.color.set(0x140c10); HL.scene.fog.density = .006; HL.scene.background.set(0x0c0810);
    HL.amb.color.set(0xb08a78); HL.amb.intensity = 1.3; HL.moon.intensity = .5; HL.moon.color.set(0xffa860); HL.moon.position.set(30, 8, -10);
    const winTex = HL.mkCanvas(64, 128, (g, w, h) => { g.fillStyle = '#17121a'; g.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 12) for (let x = 5; x < w; x += 11) { g.fillStyle = Math.random() < .35 ? (Math.random() < .5 ? '#ffb860' : '#60d0ff') : '#241c26'; g.fillRect(x, y, 6, 7); } });
    for (let i = 0; i < 46; i++) { const h = HL.rnd(6, 34), x = HL.rnd(-90, 90), z = HL.rnd(-130, -30), w = HL.rnd(4, 9); const b = HL.box(w, h, w, x, h / 2, z, HL.mat({ map: winTex, emissive: 0x241a20, emissiveMap: winTex }), false); b.material.map = winTex.clone(); b.material.map.repeat.set(1, h / 14); b.material.map.needsUpdate = true; }
    const sky = new T.Mesh(new T.PlaneGeometry(500, 120), new T.MeshBasicMaterial({ map: HL.mkCanvas(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#04030a'); gr.addColorStop(.6, '#1a1030'); gr.addColorStop(.9, '#6a3020'); gr.addColorStop(1, '#ffb060'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), fog: false })); sky.position.set(0, 50, -170); HL.world.add(sky);
    HL.box(300, .3, 200, 0, -.2, -60, HL.mat({ color: 0x0c0a0e }), false);
    this.lights = []; for (let i = 0; i < 14; i++) { const m = new T.Mesh(new T.BoxGeometry(.9, .35, .35), new T.MeshBasicMaterial({ color: pick([0xffb060, 0x60d0ff, 0xff6a6a]) })); m.position.set(HL.rnd(-60, 60), HL.rnd(4, 26), HL.rnd(-100, -40)); m.userData.v = HL.rnd(1, 4) * (Math.random() < .5 ? -1 : 1); HL.world.add(m); this.lights.push(m); }
    if (!S.day || !S.dayStarted) { newDay(1); S.dayStarted = true; } else if (S.nextDay) { newDay(S.nextDay.n, S.nextDay.keep); S.nextDay = null; }
    S.fromDay = true; root.classList.remove('hidden'); render();
  },
  update(dt) {
    S.sanity = Math.max(S.sanity, .8); S.insanBase = .02; S.tension = 0; S.scrape = 0; S.wind = .015;
    this.lights.forEach(m => { m.position.x += m.userData.v * dt; if (Math.abs(m.position.x) > 70) m.userData.v *= -1; });
    const t = S.time * .05; HL.camera.position.set(Math.sin(t) * 6, 4, 8); HL.camera.lookAt(Math.sin(t) * 6, 12, -80); HL.camera.fov = 58; HL.camera.updateProjectionMatrix();
  },
};
HL.registerChapter('day', chDay);
HL.cleanups.push(i => { if (i !== HL.idx.day) { root.classList.add('hidden'); document.body.classList.remove('day'); mini.classList.add('hidden'); } });
function contract(pay, minutes) { earn(pay); adv(minutes, 25); log(`Mercenary contract: ${pay} ₵ for the family purse. Your hands still shake from the guns.`); }
HL.day = { gameSolder, tutorial: lessonSolder, contract, get D() { return D; }, newDay, render, actions, gameSort, gamePCB, gameLathe, gameCook, endDay, ride, walk, buy, cook };
const tb = $('tutBtn'); if (tb) tb.addEventListener('click', e => { e.stopPropagation(); S.dayStarted = false; S.family = null; HL.startGame(HL.idx.day); setTimeout(() => { if (D) { D.loc = 'shop'; render(); lessonSolder(); } }, 500); });
const btn = $('dayBtn'); if (btn) btn.addEventListener('click', e => { e.stopPropagation(); S.dayStarted = false; S.family = null; HL.startGame(HL.idx.day); });
})();
