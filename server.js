// Local playtest server only. The deployed site is static files plus Supabase
// (see storage.js); nothing here runs in production. No npm install needed.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { questions } from './questions.js';

const database = new URL(process.env.ROOMS_FILE || './rooms.local.json', import.meta.url);
const startingCapacity = 5;
let rooms = {};
try {
  rooms = JSON.parse(readFileSync(database, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

function saveRoom(id, room) {
  const updated = { ...rooms, [id]: room };
  const temporary = new URL(database.href + '.tmp');
  writeFileSync(temporary, JSON.stringify(updated), { mode: 0o600 });
  renameSync(temporary, database);
  rooms = updated;
}

function validAnswers(answers) {
  return Array.isArray(answers) && answers.length === questions.length &&
    questions.every((q, index) => {
      const answer = answers[index];
      if (q.kind === 'number') return Number.isSafeInteger(answer) && answer >= 0;
      if (q.kind === 'text') return typeof answer === 'string' && answer.length <= 100;
      if (q.kind === 'assign') {
        return Array.isArray(answer) && answer.length === 3 &&
          [0, 1, 2].every(fate => answer.includes(fate));
      }
      return Number.isInteger(answer) && answer >= 0 && answer < q.options[0].length;
    });
}

async function jsonBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 4000) throw new Error('Request too large');
  }
  return JSON.parse(body);
}

function challengeMetadata(requestUrl, request) {
  let data;
  try { data = JSON.parse(requestUrl.searchParams.get('challenge')); }
  catch { return ''; }
  if (!Array.isArray(data) || data.length !== 3) return '';
  const [locale, name, icon] = data;
  if (![0, 1].includes(locale) || typeof name !== 'string' || !name.trim() || name.length > 24 ||
      !Number.isInteger(icon) || icon < 0 || icon >= 20) return '';
  const escape = value => value.replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const origin = process.env.PUBLIC_ORIGIN || 'http://' + request.headers.host;
  const canonical = new URL('/', origin);
  canonical.searchParams.set('challenge', JSON.stringify(data));
  const title = locale === 0 ? `猜猜 ${name} 怎么选` : `Guess what ${name} picked`;
  const description = locale === 0 ? '最后一口，我会给你吗？' : 'Would I give you the last bite?';
  return Object.entries({
    'og:type': 'website', 'og:title': title, 'og:description': description,
    'og:url': canonical.href, 'og:image': new URL('/challenge-cover.png', canonical).href,
    'og:image:width': '1200', 'og:image:height': '630', 'og:site_name': 'Little Things'
  }).map(([property, value]) => `<meta property="${property}" content="${escape(value)}">`).join('\n');
}

const assets = {
  '/': ['index.html', 'text/html'],
  '/recap': ['recap.html', 'text/html'],
  '/recap.html': ['recap.html', 'text/html'],
  '/invite-preview.png': ['invite-preview.png', 'image/png'],
  '/config.js': ['config.js', 'text/javascript'],
  '/storage.js': ['storage.js', 'text/javascript'],
  '/triggers.js': ['triggers.js', 'text/javascript'],
  '/vendor/qrcode.esm.js': ['vendor/qrcode.esm.js', 'text/javascript'],
  '/app.js': ['app.js', 'text/javascript'],
  '/page-scatter.js': ['page-scatter.js', 'text/javascript'],
  '/questions.js': ['questions.js', 'text/javascript'],
  '/challenge-cover.png': ['challenge-cover.png', 'image/png'],
  '/room-unavailable.png': ['room-unavailable.png', 'image/png'],
  '/everyday-cover.png': ['everyday-cover.png', 'image/png'],
  '/styles.css': ['styles.css', 'text/css']
};

createServer(async (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost');
  const path = requestUrl.pathname;
  const send = (status, data) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(data));
  };
  try {
    if (request.method === 'GET' && /^\/icons\/[a-z]+\.png$/.test(path)) {
      try {
        const image = readFileSync(new URL('.' + path, import.meta.url));
        response.writeHead(200, { 'Content-Type': 'image/png' });
        return response.end(image);
      } catch { return send(404, { error: 'Not found' }); }
    }
    if (request.method === 'GET' && /^\/avatars\/(?:[0-9]|1[0-9])\.webp$/.test(path)) {
      const image = readFileSync(new URL('.' + path, import.meta.url));
      response.writeHead(200, { 'Content-Type': 'image/webp' });
      return response.end(image);
    }
    if (request.method === 'GET' && Object.hasOwn(assets, path)) {
      const [file, type] = assets[path];
      response.writeHead(200, { 'Content-Type': type.startsWith('image/') ? type : type + '; charset=utf-8' });
      const asset = readFileSync(new URL('./' + file, import.meta.url));
      if (path === '/' && requestUrl.searchParams.has('challenge')) {
        return response.end(asset.toString().replace('</head>', challengeMetadata(requestUrl, request) + '\n</head>'));
      }
      return response.end(asset);
    }
    if (request.method === 'POST' && path === '/api/rooms') {
      const id = randomBytes(12).toString('hex');
      saveRoom(id, { players: [], submissions: [], packVersion: 2 });
      return send(201, { id });
    }
    const match = /^\/api\/rooms\/([a-f0-9]{24})(\/join|\/example-reward)?$/.exec(path);
    const id = match?.[1];
    const room = rooms[id];
    if (!id || !room) return send(404, { error: 'Room not found' });
    const players = room.players ?? room.submissions.map(entry => entry.token);
    const capacity = room.capacity ?? startingCapacity;
    if (match[2] === '/example-reward') {
      if (request.method !== 'POST') return send(405, { error: 'Method not allowed' });
      if (!players.includes(request.headers['x-player-token'])) return send(403, { error: 'Join the room first' });
      const { attempt } = await jsonBody(request).catch(() => ({}));
      if (typeof attempt !== 'string' || !/^[a-f0-9-]{36}$/.test(attempt)) return send(400, { error: 'Invalid attempt' });
      const current = rooms[id];
      const rewards = current.exampleRewards ?? [];
      if (rewards.includes(attempt)) return send(200, { unlocked: true });
      const currentCapacity = current.capacity ?? startingCapacity;
      if (currentCapacity >= 20 || (current.players?.length ?? current.submissions.length) < currentCapacity) return send(200, { unlocked: false });
      saveRoom(id, { ...current, capacity: currentCapacity + 1, exampleRewards: [...rewards, attempt] });
      return send(200, { unlocked: true });
    }
    if (match[2] === '/join') {
      if (request.method !== 'POST') return send(405, { error: 'Method not allowed' });
      const token = request.headers['x-player-token'];
      if (!/^[a-f0-9]{36}$/.test(token ?? '')) return send(400, { error: 'Invalid player token' });
      if (players.includes(token)) return send(200, { joined: true });
      if (players.length >= capacity) return send(200, { joined: false });
      saveRoom(id, { ...room, players: [...players, token] });
      return send(200, { joined: true });
    }
    if (request.method === 'GET') {
      const token = request.headers['x-player-token'];
      const submitted = room.submissions.some(entry => entry.token === token);
      return send(200, {
        count: room.submissions.length,
        joined: players.length,
        capacity,
        packVersion: room.packVersion ?? 1,
        member: players.includes(token),
        submitted,
        submissions: submitted && room.submissions.length >= 2 ? room.submissions.map(({ nickname, answers, avatar = 0 }) => ({ nickname, answers, avatar })) : []
      });
    }
    if (request.method === 'POST') {
      let input;
      try { input = await jsonBody(request); }
      catch { return send(400, { error: 'Invalid submission' }); }
      const { nickname, answers, token, avatar = 0 } = input ?? {};
      if (typeof nickname !== 'string' || !nickname.trim() || nickname.length > 24 ||
          (!Number.isInteger(avatar) || avatar < 0 || avatar >= 20) ||
          typeof token !== 'string' || !/^[a-f0-9-]{36}$/.test(token) || !validAnswers(answers)) {
        return send(400, { error: 'Invalid submission' });
      }
      const current = rooms[id];
      if (current.submissions.some(entry => entry.token === token)) return send(200, { submitted: true });
      const currentPlayers = current.players ?? current.submissions.map(entry => entry.token);
      if (!currentPlayers.includes(token)) return send(403, { error: 'Join the room first' });
      saveRoom(id, { ...current, players: currentPlayers, submissions: [...current.submissions, { nickname: nickname.trim(), answers, token, avatar }] });
      return send(201, { submitted: true });
    }
    return send(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    if (!response.headersSent) send(500, { error: 'Server error' });
    else response.end();
  }
}).listen(process.env.PORT || 4188, process.env.HOST || '127.0.0.1', () => {
  console.log('Little Things is ready on port ' + (process.env.PORT || 4188));
});
