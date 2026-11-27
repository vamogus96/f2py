#!/usr/bin/env node
'use strict';
/* Licence compliance check for Hollow Lullaby. Run:  npm run check:licenses
   Fails on: disallowed dependency licences, dependencies missing from THIRD_PARTY_NOTICES.md, or a vendored three.js without its MIT header.
   Warns (does not fail) while the project itself has no LICENSE file. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const ALLOWED = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD']);
let failed = false;
const fail = m => { failed = true; console.error('FAIL  ' + m); }, warn = m => console.warn('WARN  ' + m), ok = m => console.log('ok    ' + m);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const notices = fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8').toLowerCase();

// 1. every production dependency (and, if installed, its transitive tree) must be allowed and listed
const seen = new Set();
function audit(name, depth) {
  if (seen.has(name)) return; seen.add(name);
  const f = path.join(root, 'node_modules', name, 'package.json');
  if (!fs.existsSync(f)) { warn(`${name} is not installed; run npm install for a full check`); return; }
  const p = JSON.parse(fs.readFileSync(f, 'utf8')), lic = typeof p.license === 'string' ? p.license : (p.license && p.license.type) || 'UNKNOWN';
  if (!ALLOWED.has(lic)) fail(`${name}@${p.version} has licence "${lic}", which is not on the allow-list (${[...ALLOWED].join(', ')})`); else ok(`${name}@${p.version}: ${lic}`);
  if (depth === 0 && !notices.includes(name.toLowerCase())) fail(`${name} is a direct dependency but is not listed in THIRD_PARTY_NOTICES.md`);
  Object.keys(p.dependencies || {}).forEach(d => audit(d, depth + 1));
}
Object.keys(pkg.dependencies || {}).forEach(d => audit(d, 0));

// 2. vendored three.js keeps its licence header, and is in the notices
const three = fs.readFileSync(path.join(root, 'three.min.js'), 'utf8').slice(0, 2000);
if (/SPDX-License-Identifier:\s*MIT/.test(three) && /Three\.js Authors/.test(three)) ok('three.min.js carries its MIT header'); else fail('three.min.js has lost its MIT licence header');
if (!notices.includes('three.js')) fail('three.js is not listed in THIRD_PARTY_NOTICES.md');

// 3. the project's own licence (a decision for the owner, so only a warning)
if (!['LICENSE', 'LICENSE.md', 'LICENSE.txt'].some(f => fs.existsSync(path.join(root, f)))) warn('dream-horror/ has no LICENSE file yet. See docs/LICENSING.md');
else ok('project LICENSE present');

process.exit(failed ? 1 : 0);
