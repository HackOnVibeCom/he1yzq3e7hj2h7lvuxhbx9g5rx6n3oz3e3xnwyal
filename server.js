// Local playtest server only. The deployed site is static files plus Supabase
// (see storage.js); nothing here runs in production. No npm install needed.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { questions } from './questions.js';

const database = new URL('./rooms.local.json', import.meta.url);
let rooms = {};
try {
  rooms = JSON.parse(readFileSync(database, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

function saveRoom(id, room) {
  const updated = { ...rooms, [id]: room };
  const temporary = new URL('./rooms.local.tmp', import.meta.url);
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
  '/config.js': ['config.js', 'text/javascript'],
  '/storage.js': ['storage.js', 'text/javascript'],
  '/vendor/qrcode.esm.js': ['vendor/qrcode.esm.js', 'text/javascript'],
  '/app.js': ['app.js', 'text/javascript'],
  '/questions.js': ['questions.js', 'text/javascript'],
  '/challenge-cover.png': ['challenge-cover.png', 'image/png'],
  '/party-die.png': ['party-die.png', 'image/png'],
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
      saveRoom(id, { submissions: [] });
      return send(201, { id });
    }
    const match = /^\/api\/rooms\/([a-f0-9]{24})$/.exec(path);
    const id = match?.[1];
    const room = rooms[id];
    if (!id || !room) return send(404, { error: 'Room not found' });
    if (request.method === 'GET') {
      const token = request.headers['x-player-token'];
      const submitted = room.submissions.some(entry => entry.token === token);
      return send(200, {
        count: room.submissions.length,
        submissions: submitted ? room.submissions.map(({ nickname, answers, avatar = 0 }) => ({ nickname, answers, avatar })) : []
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
      saveRoom(id, { submissions: [...current.submissions, { nickname: nickname.trim(), answers, token, avatar }] });
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
