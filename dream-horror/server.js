'use strict';
/* Hollow Lullaby — static file server + tiny WebSocket relay for the multiplayer Void battle.
   Usage:  npm install && node server.js      (then open http://localhost:8787 on every machine)
   The relay only forwards messages between players in the same room. It has no anti-cheat (prototype). */
const http = require('http'), fs = require('fs'), path = require('path');
let WebSocketServer;
try { ({ WebSocketServer } = require('ws')); } catch (e) { console.error('Missing dependency. Run:  npm install'); process.exit(1); }
const PORT = +process.env.PORT || 8787, ROOT = __dirname, MAX_ROOM = 8;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.md': 'text/plain; charset=utf-8', '.json': 'application/json' };
const BLOCK = /(^|[\\/])(\.|node_modules|server\.js|package(-lock)?\.json)/;

const server = http.createServer((req, res) => {
  let u; try { u = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { res.writeHead(400); return res.end('bad request'); }
  if (u === '/') u = '/index.html';
  const f = path.normalize(path.join(ROOT, u));
  if (!f.startsWith(ROOT + path.sep) || BLOCK.test(path.relative(ROOT, f))) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 2048 });
const rooms = new Map(); let nextId = 1;
const RELAY = new Set(['s', 'f', 'k', 'b', 'chat']);
const clean = (s, n) => String(s == null ? '' : s).replace(/[^\w \-.]/g, '').slice(0, n);

function sendTo(ws, o) { if (ws.readyState === 1) ws.send(JSON.stringify(o)); }
function others(room, me, o) { const raw = JSON.stringify(o); for (const c of room) if (c !== me && c.readyState === 1) c.send(raw); }

wss.on('connection', ws => {
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  ws.tokens = 80; ws.meta = null;
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw.toString()); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (!ws.meta) {
      if (m.t !== 'join') return;
      const rn = clean(m.room, 16) || 'lobby', room = rooms.get(rn) || new Set();
      if (room.size >= MAX_ROOM) { sendTo(ws, { t: 'full' }); return ws.close(); }
      ws.meta = { id: nextId++, room: rn, name: clean(m.name, 16) || 'pilot', team: m.team === 'navy' ? 'navy' : 'pirate' };
      rooms.set(rn, room);
      sendTo(ws, { t: 'welcome', id: ws.meta.id, players: [...room].map(c => ({ id: c.meta.id, name: c.meta.name, team: c.meta.team })) });
      others(room, ws, { t: 'join', id: ws.meta.id, name: ws.meta.name, team: ws.meta.team });
      room.add(ws); return;
    }
    if (!RELAY.has(m.t)) return;
    ws.tokens -= 1; if (ws.tokens < 0) return;           // flood control
    m.id = ws.meta.id; others(rooms.get(ws.meta.room), ws, m);
  });
  ws.on('close', () => {
    if (!ws.meta) return; const room = rooms.get(ws.meta.room); if (!room) return;
    room.delete(ws); others(room, ws, { t: 'leave', id: ws.meta.id }); if (!room.size) rooms.delete(ws.meta.room);
  });
});
setInterval(() => { for (const c of wss.clients) { c.tokens = Math.min(80, c.tokens + 40); if (!c.isAlive) { c.terminate(); continue; } c.isAlive = false; c.ping(); } }, 1000);
server.listen(PORT, () => console.log(`Hollow Lullaby on http://localhost:${PORT}  (WebSocket relay at /ws)`));
