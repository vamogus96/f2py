/* HOLLOW LULLABY — reduced-order physics.
   Instead of a general rigid-body engine, every moving thing uses the smallest model that still feels right:
     · characters  = a circle with exponentially-relaxed velocity (a first-order lag) and sliding contact
     · ships       = a planar rigid body with three states per axis (surge, sway, yaw) and quadratic drag, advanced by semi-implicit Euler
     · projectiles = points moving in straight lines, tested with *swept* segments so they can never tunnel
   Everything is stepped at a FIXED time step (see Stepper), so behaviour does not depend on the frame rate.
   Pure functions, no DOM and no three.js: unit-tested in Node (scripts/test-physics.js) and loaded in the browser as window.HLPhys. */
(function (root) {
  'use strict';
  const P = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ── fixed time step with an accumulator ("Fix Your Timestep") ── */
  P.STEP = 1 / 60; P.MAX_STEPS = 6;
  P.Stepper = function (step, maxSteps) {
    this.step = step || P.STEP; this.max = maxSteps || P.MAX_STEPS; this.acc = 0; this.dropped = 0;
  };
  /* advance(frameDt, fn): calls fn(step) 0..max times and returns how many steps ran. Time beyond max steps is dropped (spiral-of-death guard). */
  P.Stepper.prototype.advance = function (frameDt, fn) {
    this.acc += Math.min(frameDt, 0.25); let n = 0;
    while (this.acc >= this.step && n < this.max) { fn(this.step); this.acc -= this.step; n++; }
    if (n === this.max && this.acc >= this.step) { this.dropped += this.acc; this.acc = 0; }
    return n;
  };
  P.Stepper.prototype.alpha = function () { return this.acc / this.step; };   // for render interpolation

  /* ── first-order lag: v follows target with a time constant 1/rate. Exact for any dt (no frame-rate dependence) ── */
  P.relax = (v, target, rate, dt) => target + (v - target) * Math.exp(-rate * dt);

  /* ── ships: planar rigid body, quadratic drag, keel ── */
  P.SHIP = {
    thrust: 16, reverse: 7, boost: 2.2,          // engine accelerations (units/s^2, mass = 1)
    dragFwd: 0.30, dragLat: 2.6, dragQuad: 0.04, // F = -(c1 + c2|v|) v  (the keel resists sideways motion ~9x more than forward motion)
    rudder: 5.2, yawDamp: 3.0, yawMax: 2.4,      // yaw torque, yaw damping (rad/s per rad/s^2), yaw-rate limit
    flowRef: 12, rudderFloor: 0.35,              // rudder authority grows with water... with flow past it: floor at standstill (thrusters)
    mass: 1, radius: 1.5,
  };
  /* s: { x, z, a, vx, vz, w }   ctl: { thrust: -1..1, turn: -1..1, boost: bool }   forward = (sin a, cos a), starboard = (cos a, -sin a) */
  P.stepShip = function (s, ctl, dt, prm) {
    prm = prm || P.SHIP; if (s.w === undefined) s.w = 0;
    const fx = Math.sin(s.a), fz = Math.cos(s.a), sx = Math.cos(s.a), sz = -Math.sin(s.a);
    let vf = s.vx * fx + s.vz * fz, vl = s.vx * sx + s.vz * sz;                       // body-frame surge and sway
    const sp = Math.hypot(vf, vl), thr = ctl.thrust > 0 ? prm.thrust * (ctl.boost ? prm.boost : 1) * ctl.thrust : ctl.thrust < 0 ? prm.reverse * ctl.thrust : 0;
    vf += (thr - (prm.dragFwd + prm.dragQuad * sp) * vf) * dt;                         // semi-implicit Euler: stable for these stiffness values at dt <= 1/30
    vl += (-(prm.dragLat + prm.dragQuad * sp) * vl) * dt;
    const authority = clamp(prm.rudderFloor + Math.abs(vf) / prm.flowRef, 0, 1);
    s.w += (prm.rudder * clamp(ctl.turn || 0, -1, 1) * authority - prm.yawDamp * s.w) * dt; s.w = clamp(s.w, -prm.yawMax, prm.yawMax);
    s.a += s.w * dt;
    const nfx = Math.sin(s.a), nfz = Math.cos(s.a), nsx = Math.cos(s.a), nsz = -Math.sin(s.a);   // rotate the body-frame velocity with the new heading: the keel "carries" the ship round
    s.vx = nfx * vf + nsx * vl; s.vz = nfz * vf + nsz * vl;
    s.x += s.vx * dt; s.z += s.vz * dt;
    return s;
  };
  /* terminal surge speed under constant thrust (solves thrust = c1 v + c2 v^2) — used by the tests and the HUD */
  P.terminalSpeed = (thrust, prm) => { prm = prm || P.SHIP; const a = prm.dragQuad, b = prm.dragFwd; return (-b + Math.sqrt(b * b + 4 * a * thrust)) / (2 * a); };

  /* soft arena wall: a spring pushes ships back instead of teleporting them (no velocity discontinuity) */
  P.softBoundary = function (s, R, k, damp, dt) {
    const r = Math.hypot(s.x, s.z); if (r <= R) return false; const nx = s.x / r, nz = s.z / r, pen = r - R, vn = s.vx * nx + s.vz * nz;
    s.vx -= nx * (k * pen + (vn > 0 ? damp * vn : 0)) * dt; s.vz -= nz * (k * pen + (vn > 0 ? damp * vn : 0)) * dt; return true;
  };

  /* ── contacts ── */
  /* circle (a) against a fixed circle: positional correction + impulse. Returns the closing speed (0 if no contact). */
  P.circleVsStatic = function (a, ra, cx, cz, R, e) {
    const dx = a.x - cx, dz = a.z - cz, d = Math.hypot(dx, dz) || 1e-6, pen = ra + R - d; if (pen <= 0) return 0;
    const nx = dx / d, nz = dz / d; a.x += nx * pen; a.z += nz * pen; const vn = a.vx * nx + a.vz * nz;
    if (vn < 0) { a.vx -= (1 + (e || 0)) * vn * nx; a.vz -= (1 + (e || 0)) * vn * nz; return -vn; } return 0;
  };
  /* two moving circles with masses (m defaults to 1): impulse along the contact normal. Returns the closing speed. */
  P.circleVsCircle = function (a, ra, b, rb, e) {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1e-6, pen = ra + rb - d; if (pen <= 0) return 0;
    const nx = dx / d, nz = dz / d, ma = a.m || 1, mb = b.m || 1, ia = 1 / ma, ib = 1 / mb, tot = ia + ib;
    a.x -= nx * pen * ia / tot; a.z -= nz * pen * ia / tot; b.x += nx * pen * ib / tot; b.z += nz * pen * ib / tot;
    const rvn = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz; if (rvn >= 0) return 0;                       // already separating
    const j = -(1 + (e == null ? .4 : e)) * rvn / tot;
    a.vx -= j * ia * nx; a.vz -= j * ia * nz; b.vx += j * ib * nx; b.vz += j * ib * nz; return -rvn;
  };
  /* circle against an axis-aligned box. Pushes out along the contact normal and removes the velocity component that points into the box (sliding). */
  P.circleVsBox = function (p, r, c) {
    const nx = clamp(p.x, c.x0, c.x1), nz = clamp(p.z, c.z0, c.z1); let dx = p.x - nx, dz = p.z - nz; const d2 = dx * dx + dz * dz; if (d2 >= r * r) return false;
    if (d2 > 1e-12) { const d = Math.sqrt(d2); dx /= d; dz /= d; p.x = nx + dx * r; p.z = nz + dz * r; }
    else { const l = p.x - c.x0, rr = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, rr, t, b); dx = dz = 0; if (m === l) { dx = -1; p.x = c.x0 - r; } else if (m === rr) { dx = 1; p.x = c.x1 + r; } else if (m === t) { dz = -1; p.z = c.z0 - r; } else { dz = 1; p.z = c.z1 + r; } }
    if (p.vx !== undefined) { const vn = p.vx * dx + p.vz * dz; if (vn < 0) { p.vx -= vn * dx; p.vz -= vn * dz; } }
    return true;
  };
  /* move a circle by (dx, dz) in sub-steps no longer than r/2, resolving against the boxes after each one: nothing can tunnel, whatever the speed */
  P.moveCircle = function (p, dx, dz, r, boxes) {
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (r * 0.5)));
    for (let i = 0; i < n; i++) { p.x += dx / n; p.z += dz / n; for (let k = 0; k < boxes.length; k++) if (boxes[k].on !== false) P.circleVsBox(p, r, boxes[k]); }
  };

  /* ── swept tests (projectiles) ── */
  /* does the segment (x0,z0)-(x1,z1) touch the box? (slab method) */
  P.segmentBox = function (x0, z0, x1, z1, c) {
    const dx = x1 - x0, dz = z1 - z0; let t0 = 0, t1 = 1;
    for (let i = 0; i < 2; i++) {
      const o = i ? z0 : x0, d = i ? dz : dx, lo = i ? c.z0 : c.x0, hi = i ? c.z1 : c.x1;
      if (Math.abs(d) < 1e-12) { if (o < lo || o > hi) return false; } else { let a = (lo - o) / d, b = (hi - o) / d; if (a > b) { const t = a; a = b; b = t; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return false; }
    }
    return true;
  };
  /* does the segment come within r of the point (cx, cz)? */
  P.segmentCircle = function (x0, z0, x1, z1, cx, cz, r) {
    const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz; let t = l2 > 0 ? ((cx - x0) * dx + (cz - z0) * dz) / l2 : 0; t = clamp(t, 0, 1);
    const px = x0 + dx * t - cx, pz = z0 + dz * t - cz; return px * px + pz * pz <= r * r;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = P; else root.HLPhys = P;
})(typeof window !== 'undefined' ? window : globalThis);
