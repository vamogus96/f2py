#!/usr/bin/env node
'use strict';
/* Unit tests for the reduced-order physics (physics.js). Run: npm run test:physics */
const assert = require('assert');
const P = require('../physics.js');
let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('ok    ' + name); } catch (e) { failed++; console.error('FAIL  ' + name + '\n      ' + e.message); } }
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} ± ${tol}, got ${a}`);
const newShip = () => ({ x: 0, z: 0, a: 0, vx: 0, vz: 0, w: 0 });

/* run a ship for `seconds` of game time, driven through the Stepper with the given frame pattern (frame durations repeat) */
function simulate(ship, ctl, seconds, frames) {
  const st = new P.Stepper(); let t = 0, i = 0;
  while (t < seconds) { const fd = frames[i++ % frames.length]; t += fd; st.advance(fd, step => P.stepShip(ship, typeof ctl === 'function' ? ctl() : ctl, step)); }
  return st;
}

/* ───────── fixed time step ───────── */
test('Stepper runs the right number of steps for any frame length', () => {
  for (const fd of [1 / 30, 1 / 60, 1 / 144, 0.0073]) { const s = new P.Stepper(); let n = 0; for (let i = 0; i < Math.round(2 / fd); i++) n += s.advance(fd, () => {}); near(n * P.STEP, 2, P.STEP * 2, `frame ${fd}`); }
});
test('Stepper drops time instead of spiralling after a long stall', () => {
  const s = new P.Stepper(); const n = s.advance(5, () => {}); assert.strictEqual(n, P.MAX_STEPS); assert.ok(s.acc < P.STEP, 'accumulator was cleared'); assert.ok(s.dropped > 0);
});

/* ───────── frame-rate independence ───────── */
test('same input gives the same ship trajectory at 30, 60, 144 fps and with jittery frames', () => {
  const ctl = { thrust: 1, turn: 0.6, boost: false }, ref = newShip(); simulate(ref, ctl, 8, [1 / 60]);
  for (const frames of [[1 / 30], [1 / 144], [1 / 60 + 0.004, 1 / 60 - 0.004], [0.011, 0.023, 0.017]]) {
    const s = newShip(); simulate(s, ctl, 8, frames);
    near(s.x, ref.x, 1.5, 'x'); near(s.z, ref.z, 1.5, 'z');            // differs only by the (< 1 step) partial step left in the accumulator
    near(Math.hypot(s.vx, s.vz), Math.hypot(ref.vx, ref.vz), 0.25, 'speed');
  }
});
test('relax() is exact: one big step equals many small steps', () => {
  let a = 0; const one = P.relax(0, 10, 7, 0.5); for (let i = 0; i < 50; i++) a = P.relax(a, 10, 7, 0.01); near(a, one, 1e-9);
});

/* ───────── ship model ───────── */
test('terminal speed matches the analytic solution of thrust = c1 v + c2 v^2', () => {
  const s = newShip(); simulate(s, { thrust: 1, turn: 0, boost: false }, 40, [1 / 60]);
  near(Math.hypot(s.vx, s.vz), P.terminalSpeed(P.SHIP.thrust), P.terminalSpeed(P.SHIP.thrust) * 0.02, 'cruise');
  const b = newShip(); simulate(b, { thrust: 1, turn: 0, boost: true }, 40, [1 / 60]);
  near(Math.hypot(b.vx, b.vz), P.terminalSpeed(P.SHIP.thrust * P.SHIP.boost), P.terminalSpeed(P.SHIP.thrust * P.SHIP.boost) * 0.02, 'boost');
  assert.ok(Math.hypot(b.vx, b.vz) > Math.hypot(s.vx, s.vz) * 1.4, 'boost is meaningfully faster');
});
test('steady yaw rate follows rudder authority / yaw damping, and never exceeds the limit', () => {
  const s = newShip(); s.vz = P.terminalSpeed(P.SHIP.thrust); simulate(s, { thrust: 1, turn: 1, boost: false }, 8, [1 / 60]);
  assert.ok(s.w <= P.SHIP.yawMax + 1e-9); assert.ok(s.w > 1.0, 'turns at a useful rate'); assert.ok(s.a > 5, 'heading actually changed');
  const d = newShip(); simulate(d, { thrust: 0, turn: -1, boost: false }, 3, [1 / 60]); assert.ok(d.w < 0, 'negative turn turns the other way');
});
test('the keel kills sideways drift with the expected time constant', () => {
  const s = newShip(); s.vx = 10;                                       // pure sway for a ship pointing along +z
  simulate(s, { thrust: 0, turn: 0, boost: false }, 1.5, [1 / 60]); assert.ok(Math.abs(s.vx) < 10 * Math.exp(-P.SHIP.dragLat * 1.5) * 1.6 + 0.1, 'sway decayed: ' + s.vx);
});
test('a coasting ship never gains energy (no numerical blow-up), even at 30 Hz', () => {
  const s = newShip(); s.vz = 20; s.vx = 6; s.w = 1.2; let e0 = Infinity;
  for (let i = 0; i < 600; i++) { P.stepShip(s, { thrust: 0, turn: 0, boost: false }, 1 / 30); const e = s.vx * s.vx + s.vz * s.vz; assert.ok(e <= e0 + 1e-9, 'energy rose at step ' + i); e0 = e; assert.ok(Number.isFinite(e)); }
});
test('a turning ship follows its heading: velocity direction converges to the bow direction', () => {
  const s = newShip(); simulate(s, { thrust: 1, turn: 1, boost: false }, 6, [1 / 60]);
  const heading = Math.atan2(Math.sin(s.a), Math.cos(s.a)), course = Math.atan2(s.vx, s.vz); let d = course - s.a; d = Math.atan2(Math.sin(d), Math.cos(d)); assert.ok(Math.abs(d) < 0.7, 'slip angle small: ' + d);
});

/* ───────── contacts ───────── */
test('ship-ship collision conserves momentum and separates the hulls', () => {
  const a = { x: 0, z: 0, vx: 5, vz: 0, m: 1 }, b = { x: 2, z: 0.1, vx: -3, vz: 0, m: 1 }, p0x = a.vx + b.vx, p0z = a.vz + b.vz;
  const closing = P.circleVsCircle(a, 1.5, b, 1.5, 0.4); assert.ok(closing > 7.9 && closing < 8.1, 'closing speed ' + closing);
  near(a.vx + b.vx, p0x, 1e-9); near(a.vz + b.vz, p0z, 1e-9); assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 3 - 1e-9, 'no longer overlapping');
  const rvn = (b.vx - a.vx) * 1 + (b.vz - a.vz) * 0.0; assert.ok(rvn > 0, 'separating after impact');
});
test('restitution: normal speed after = e * before', () => {
  const a = { x: 0, z: 0, vx: 4, vz: 0 }, k = P.circleVsStatic(a, 1, 1.5, 0, 1, 0.5); near(k, 4, 1e-9); near(a.vx, -2, 1e-9);
});
test('a heavy body barely moves when hit by a light one', () => {
  const small = { x: 0, z: 0, vx: 6, vz: 0, m: 1 }, big = { x: 2.9, z: 0, vx: 0, vz: 0, m: 1000 }; P.circleVsCircle(small, 1.5, big, 1.5, 0.4); assert.ok(Math.abs(big.vx) < 0.02 && small.vx < 0);
});
test('sliding along a wall keeps the tangential velocity and removes the normal one', () => {
  const p = { x: 0.9, z: 0, vx: 4, vz: 3 }, wall = { x0: 1, x1: 1.2, z0: -10, z1: 10, on: true };
  P.circleVsBox(p, 0.32, wall); near(p.vz, 3, 1e-9, 'tangential kept'); assert.ok(p.vx <= 1e-9, 'normal removed'); assert.ok(p.x <= 1 - 0.32 + 1e-6);
});
test('moveCircle cannot tunnel through a thin wall at any speed, a single naive step does', () => {
  const wall = [{ x0: 10, x1: 10.2, z0: -5, z1: 5, on: true }], p = { x: 0, z: 0, vx: 0, vz: 0 }; P.moveCircle(p, 50, 0, 0.32, wall); assert.ok(p.x < 10, 'stopped at the wall: ' + p.x);
  const naive = { x: 0 + 50, z: 0 }; assert.ok(naive.x > 10.2, 'a naive one-step move ends up on the far side (the bug this avoids)');
});

/* ───────── swept projectiles ───────── */
test('swept segment tests catch a 200 u/s bullet that a point test misses', () => {
  const wall = { x0: 10, x1: 10.2, z0: -5, z1: 5 }, x0 = 9.0, x1 = x0 + 200 / 60 * 1;   // one 60 Hz step of a very fast bullet: 3.3 units, wall is 0.2 thick
  assert.ok(!(x1 > wall.x0 && x1 < wall.x1), 'the end point is already past the wall: a point test misses it');
  assert.ok(P.segmentBox(x0, 0, x1, 0, wall), 'the swept test sees it');
  assert.ok(!P.segmentBox(x0, 8, x1, 8, wall), 'and does not report a miss as a hit');
});
test('segmentCircle: a shell passing through a ship between two frames is detected', () => {
  assert.ok(P.segmentCircle(-5, 0.5, 5, 0.5, 0, 0, 1.7)); assert.ok(!P.segmentCircle(-5, 4, 5, 4, 0, 0, 1.7)); assert.ok(P.segmentCircle(1, 1, 1, 1, 0, 0, 1.7), 'zero-length segment = point test');
});

/* ───────── arena boundary ───────── */
test('the soft arena wall turns a fast ship around without teleporting it', () => {
  const s = { x: 60, z: 0, vx: 30, vz: 0 }; let maxR = 0, jump = 0, prev = s.x;
  for (let i = 0; i < 600; i++) { P.softBoundary(s, 68, 6, 2, 1 / 60); s.x += s.vx / 60; s.z += s.vz / 60; maxR = Math.max(maxR, Math.hypot(s.x, s.z)); jump = Math.max(jump, Math.abs(s.x - prev)); prev = s.x; }
  assert.ok(maxR < 68 + 14, 'overshoot bounded: ' + maxR); assert.ok(s.vx < 0 || s.x < 68, 'pushed back'); assert.ok(jump < 1, 'no position jumps: ' + jump);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
