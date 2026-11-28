/* HOLLOW LULLABY — floors of the Arasaka Tower (the former Intesa Sanpaolo skyscraper, Turin, 2147).
   Pure data so Node can validate it (scripts/test-maps.js). Legend:
     # wall   D desk (blocks movement and bullets)   d door (swings open, stuns whoever stands behind it)
     P start  X exit lift   w weapon   g pistol guard   b bat guard   s shotgun heavy   k blade-runner (lunges)
     o optic sniper (laser)   x psycho (fast, erratic)   C the Chairman (boss) */
(function (root) {
  'use strict';
  const FLOORS = [
    { name: 'Floor 1: The Lobby', sub: 'Marble, gold, and the guards the board hired', pal: { a: '#2a1018', b: '#3a1622', line: '#ffcf6a', glow: 0xffcf6a, wall: 0x1a0c12 }, pool: ['bat', 'knife', 'pistol'], map: [
      '########################',
      '#P.....#.......#.......#',
      '#......#...g...#...b...#',
      '#..w...d.......d.......#',
      '#......#...w...#...g...#',
      '####d#####..#######d####',
      '#......................#',
      '#..g.......b..........X#',
      '#......####....####....#',
      '#...b..#..........#..g.#',
      '#......d....w.....d....#',
      '#......#..........#....#',
      '########################'] },
    { name: 'Floor 2: The Trading Floor', sub: 'Money moves faster than the people paid to guard it', pal: { a: '#0a1a2e', b: '#10263e', line: '#4ac8ff', glow: 0x4ac8ff, wall: 0x0a1220 }, pool: ['pistol', 'shotgun', 'knife', 'smg'], map: [
      '########################',
      '#P....D.D.D.D.D.D.....##',
      '#.....................k#',
      '#..w..D.D.D.D.D.D...g..#',
      '#.....................##',
      '#####d####....###d######',
      '#...g...#..g...#...b...#',
      '#.......d......d.......#',
      '#..w....#...D..#...k...#',
      '#.......#......#.......#',
      '####d####..w...####d####',
      '#.........g...........X#',
      '########################'] },
    { name: 'Floor 3: The Improvement Suites', sub: 'Where Turin buys itself a better body, and loses the rest', pal: { a: '#1e0a2e', b: '#2c1044', line: '#ff4ad0', glow: 0xff4ad0, wall: 0x140820 }, pool: ['shotgun', 'smg', 'knife', 'bat'], map: [
      '########################',
      '#P..#.....#.....#......#',
      '#...#..x..#..o..#..x...#',
      '#...d.....d.....d......#',
      '#...#..w..#..w..#......#',
      '#####..#######..########',
      '#......................#',
      '#.o..####......####..o.#',
      '#....#...x....x.#......#',
      '#.w..d..........d....w.#',
      '#....#..........#......#',
      '#....#####..#####.....X#',
      '########################'] },
    { name: 'Floor 4: The Chairman\'s Roof Garden', sub: 'The only plants in Turin that nobody had to be grown into', pal: { a: '#0c2410', b: '#123418', line: '#b4ff5a', glow: 0xb4ff5a, wall: 0x0a160c }, pool: ['shotgun', 'smg', 'pistol'], map: [
      '####################',
      '#P.................#',
      '#..w...D.....D...w.#',
      '#..................#',
      '#......g.....g.....#',
      '#..D.............D.#',
      '#........C.........#',
      '#..D.............D.#',
      '#.....s.......s....#',
      '#..................#',
      '#..w.............w.#',
      '#.................X#',
      '####################'] },
  ];
  /* validation: used by scripts/test-maps.js */
  function validate(f) {
    const errs = [], rows = f.map, H = rows.length, W = rows[0].length;
    rows.forEach((r, i) => { if (r.length !== W) errs.push(`${f.name}: row ${i} has width ${r.length}, expected ${W}`); });
    const cells = [].concat(...rows.map((r, y) => [...r].map((c, x) => ({ c, x, y }))));
    const count = ch => cells.filter(k => k.c === ch).length;
    if (count('P') !== 1) errs.push(`${f.name}: needs exactly one P`); if (count('X') !== 1) errs.push(`${f.name}: needs exactly one X`);
    const start = cells.find(k => k.c === 'P'); if (!start) return errs;
    const seen = new Set([start.x + ',' + start.y]), q = [start];
    while (q.length) { const { x, y } = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue; const ch = rows[ny][nx]; if (ch === '#' || ch === 'D' || seen.has(nx + ',' + ny)) continue; seen.add(nx + ',' + ny); q.push({ x: nx, y: ny }); } }
    cells.forEach(k => { if (!'#D.'.includes(k.c) && !seen.has(k.x + ',' + k.y)) errs.push(`${f.name}: '${k.c}' at (${k.x},${k.y}) is unreachable`); });
    cells.forEach(k => { if (k.c === 'd') { const h = rows[k.y][k.x - 1] === '#' && rows[k.y][k.x + 1] === '#', v = rows[k.y - 1][k.x] === '#' && rows[k.y + 1][k.x] === '#'; if (!h && !v) errs.push(`${f.name}: door at (${k.x},${k.y}) is not set in a wall`); } });
    cells.forEach(k => { if ((k.x === 0 || k.y === 0 || k.x === W - 1 || k.y === H - 1) && k.c !== '#') errs.push(`${f.name}: border cell (${k.x},${k.y}) is not a wall`); });
    return errs;
  }
  /* Improvements (cybernetic "masks"): perk, cyberpsychosis cost (%), price at the Poors ripperdoc (credits) */
  const IMPLANTS = {
    mantis: { name: 'Mantis blades', psy: 20, cost: 90, desc: 'Forearm blades: fists kill, melee reach +50%' },
    optic: { name: 'Optic grid', psy: 15, cost: 70, desc: 'Shows every guard\'s vision cone, through the walls' },
    reflex: { name: 'Reflex booster', psy: 25, cost: 140, desc: 'Guards notice you and aim 50% slower' },
    dash: { name: 'Sandevistan burst', psy: 25, cost: 160, desc: 'Shift: a short invulnerable dash (2 s cooldown)' },
    subdermal: { name: 'Subdermal plating', psy: 30, cost: 200, desc: 'Survive one hit per floor' },
  };
  const API = { FLOORS, validate, IMPLANTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.HLMaps = API;
})(typeof window !== 'undefined' ? window : globalThis);
