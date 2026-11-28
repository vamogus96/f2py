#!/usr/bin/env node
'use strict';
/* Validates the tower floors: equal row widths, one start and one exit, every enemy / weapon / door reachable, doors set in walls, closed borders. */
const { FLOORS, validate } = require('../hotline-maps.js');
let bad = 0;
FLOORS.forEach(f => { const e = validate(f); if (e.length) { bad += e.length; e.forEach(m => console.error('FAIL  ' + m)); } else console.log(`ok    ${f.name} (${f.map[0].length}x${f.map.length})`); });
process.exit(bad ? 1 : 0);
