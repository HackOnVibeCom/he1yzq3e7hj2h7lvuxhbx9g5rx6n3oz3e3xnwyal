import { questions } from './questions.js';
import { createRoom, readRoom, submitAnswers, qrDataUrl } from './storage.js';
import { personalLines, personalPanels } from './triggers.js';

const app = document.querySelector('#app');
const language = document.querySelector('#language');
const params = new URLSearchParams(location.search);
const debug = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && params.get('debug') === '1';
const roomParam = params.get('room');
let room = /^[a-f0-9]{24}$/.test(roomParam ?? '') ? roomParam : null;
let lang = localStorage.getItem('little-things-language') === 'zh' ? 0 : 1;
let screen = 'home';
let index = 0;
let roster = { count: 0, submissions: [] };
let token = '';
let answers = Array(questions.length).fill(null);
let nickname = '';
let avatar = 0;
// Keep the familiar characters in their legacy slots where possible.
const avatars = [
  [10, '青蛙', 'Frog'], [0, '狐狸', 'Fox'], [12, '花朵', 'Flower'],
  [8, '太空猫', 'Space cat'], [7, '墨镜星星', 'Cool star'], [6, '幽灵', 'Ghost'],
  [1, '紫色精灵', 'Purple sprite'], [2, '机器人', 'Robot'], [3, '棒球帽小狗', 'Cap dog'],
  [4, '恐龙', 'Dinosaur'], [5, '绵羊', 'Sheep'], [9, '雪山', 'Snowy mountain'],
  [11, '猫头鹰', 'Owl'], [13, '闪电', 'Lightning'], [14, '火苗', 'Flame'],
  [15, '小巫师', 'Wizard'], [16, '饭团', 'Rice ball'], [17, '外星人', 'Alien'],
  [18, '电视机', 'Television'], [19, '小鱼', 'Fish']
];
const avatarUrl = id => `/avatars/${avatars[id][0]}.webp`;
const avatarImages = avatars.map((_, id) => {
  const image = new Image();
  image.src = avatarUrl(id);
  return image;
});
let busy = false;
const t = (zh, en) => [zh, en][lang];
const escape = value => String(value).replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const button = (id, label, style = '') => `<button type="button" class="button ${style}" id="${id}">${label}</button>`;
const linkAction = (id, handler) => document.getElementById(id)?.addEventListener('click', handler);
const recapPalettes = {
  red: ['#f77a74', '珊瑚红', 'Coral red'], orange: ['#ffbb72', '橙色', 'Orange'],
  yellow: ['#ffe472', '黄色', 'Yellow'], lime: ['#dbf250', '黄绿色', 'Lime'],
  mint: ['#86e0b0', '薄荷绿', 'Mint'], cyan: ['#77dce4', '青色', 'Cyan'],
  blue: ['#a1c1fc', '蓝色', 'Blue'], purple: ['#c7adfa', '紫色', 'Purple'],
  pink: ['#ffc1d2', '粉色', 'Pink']
};
const avatarColors = [
  'purple', 'cyan', 'mint', 'red', 'blue', 'yellow', 'orange', 'mint', 'pink', 'purple',
  'blue', 'yellow', 'orange', 'red', 'cyan', 'yellow', 'mint', 'pink', 'blue', 'purple'
];
const questionColors = [
  ['pink', '#6633bd'],
  ['orange', '#254fc3'],
  ['blue', '#ac3612'],
  ['purple', '#8c3900'],
  ['yellow', '#6530bd'],
  ['cyan', '#a92b38'],
  ['mint', '#ab2163'],
  ['red', '#173eaa']
];
const paletteColor = name => recapPalettes[name]?.[0] ?? recapPalettes.orange[0];
const art = (icon, colors) => {
  const style = colors ? `style="--art-bg:${paletteColor(colors[0])};--star-color:${colors[1]}"` : '';
  return `<div class="art" ${style} aria-hidden="true"><span class="sticker">${icon}</span></div>`;
};
const frame = (body, illustration = '', style = '') =>
  `<section class="frame ${style}">${illustration}<div class="content">${body}</div></section>`;
const status = '<p class="status" id="status" role="status"></p>';
function message(text) {
  const node = document.getElementById('status');
  if (node) node.textContent = text;
}

function avatarIcon(id) {
  const index = avatars[id] ? Number(id) : 0;
  return `<span class="avatar" style="--avatar-bg:${paletteColor(avatarColors[index])}" aria-hidden="true"><img src="${avatarUrl(index)}" alt=""></span>`;
}

function avatarPicker() {
  return `<fieldset class="avatar-picker"><legend>${t('挑个头像', 'Pick an avatar')}</legend>
    <div class="avatar-grid">${avatars.map(([, zh, en], i) => `<label>
      <input type="radio" name="avatar" value="${i}" aria-label="${t(zh, en)}" ${avatar === i ? 'checked' : ''}>
      ${avatarIcon(i)}
    </label>`).join('')}</div></fieldset>`;
}

// Rooms live wherever storage.js says they do: Supabase on the deployed site,
// the local Node server during `npm run dev`. Every call site below is unchanged.
async function api(path, method = 'GET', body) {
  if (path === '') return { id: await createRoom() };
  const id = path.slice(1);
  if (method === 'POST') return submitAnswers(id, body);
  return readRoom(id, token);
}

function loadPlayer() {
  const key = 'little-things:' + room;
  const player = JSON.parse(localStorage.getItem(key) || '{}');
  token = player.token || Array.from(crypto.getRandomValues(new Uint8Array(18)), byte => byte.toString(16).padStart(2, '0')).join('');
  if (player.answers) answers = player.answers;
  nickname = player.nickname || '';
  avatar = avatars[player.avatar] ? player.avatar : 0;
  savePlayer();
}

function savePlayer() {
  if (debug) return;
  localStorage.setItem('little-things:' + room, JSON.stringify({ token, answers, nickname, avatar }));
}

function show(next) {
  screen = next;
  const picker = document.getElementById('preview-page');
  if (picker) {
    picker.value = next === 'quiz' ? 'q' + index : next === 'personal' && roster.count > 1 ? 'personal-ready' : next === 'group' ? (roster.count < 2 ? 'waiting' : roster.count > 2 ? 'crowd' : 'group') : next;
    document.getElementById('preview-prev').disabled = picker.selectedIndex === 0;
    document.getElementById('preview-next').disabled = picker.selectedIndex === picker.options.length - 1;
  }
  render();
  window.scrollTo(0, 0);
  app.querySelector('h1')?.focus({ preventScroll: true });
}

async function start(copyInvite = false) {
  if (debug) {
    if (copyInvite) return invite();
    index = 0;
    return show('quiz');
  }
  if (busy) return;
  busy = true;
  try {
    if (!room) {
      ({ id: room } = await api('', 'POST'));
      history.replaceState(null, '', '?room=' + room);
      loadPlayer();
    }
    if (copyInvite) await invite();
    else show('quiz');
  } catch {
    const error = t('没建成房间，再试一次。', 'Couldn’t create a room. Try again.');
    if (copyInvite && shareDialog.open) document.getElementById('share-status').textContent = error;
    else message(error);
  } finally {
    busy = false;
  }
}

const shareDialog = document.querySelector('#share-dialog');
const headerShare = document.querySelector('#header-share');

function openShare() {
  const completed = !sharedRecap && ['personal', 'group'].includes(screen);
  const copyLabel = sharedRecap || screen === 'missing' ? t('复制页面链接', 'Copy page link') : t('复制邀请链接', 'Copy invite link');
  const submitted = debug && screen !== 'home' && !screen.startsWith('missing') ? roster.submissions.slice(0, 5) : [];
  const seats = debug && !sharedRecap ? `<div class="share-seats" aria-hidden="true">${Array.from({ length: 5 }, (_, i) =>
    `<span>${submitted[i] ? avatarIcon(submitted[i].avatar) : i === 0 ? t('你', 'You') : '+'}</span>`).join('')}</div>
    <p class="sub">${t('五人房预览 · 人数上限待定', 'Five-seat demo · limit to be decided')}</p>` : '';
  shareDialog.innerHTML = `<form method="dialog"><button class="button share-close" aria-label="${t('关闭', 'Close')}">×</button></form>
    <h2 id="share-title">${t('分享给好友', 'Share with friends')}</h2>
    ${sharedRecap ? '' : `<p class="sub">${t('朋友可以晚点答，你可以接着玩。', 'Friends can play later. You can keep going.')}</p>`}
    ${seats}
    ${completed ? `<figure class="recap-export challenge-preview share-thumbnail" aria-busy="true">
      <canvas id="challenge-thumbnail" role="img" aria-label="${escape(resultCards().guess.title)}"></canvas>
      <figcaption>${t('正在生成链接预览…', 'Preparing link preview…')}</figcaption>
    </figure>` : ''}
    <div class="actions">${button('copy-invite', copyLabel, 'primary')}
    ${completed ? button('copy-challenge', t('复制猜题链接', 'Copy challenge link')) : ''}</div>
    <p id="share-status" class="status" role="status"></p>`;
  linkAction('copy-invite', () => screen === 'home' && !sharedRecap ? start(true) : invite());
  linkAction('copy-challenge', () => copyShareLink(challengeLink()));
  if (!shareDialog.open) shareDialog.showModal();
  const thumbnail = document.getElementById('challenge-thumbnail');
  if (thumbnail) drawRecapPreview(thumbnail, true);
}

async function copyShareLink(url) {
  const feedback = document.getElementById('share-status');
  try {
    await navigator.clipboard.writeText(url);
    feedback.textContent = t('链接已复制。', 'Link copied.');
  } catch {
    feedback.textContent = url;
  }
}

function invite() {
  if (debug) {
    document.getElementById('share-status').textContent =
      t('正式答题时，这里会复制房间链接。', 'In a real round, this copies the room link.');
    return;
  }
  return copyShareLink(screen === 'missing' ? new URL('./', location.href).href : location.href);
}

function valid(question, value) {
  if (question.kind === 'text') return true;
  if (question.kind === 'number') return Number.isSafeInteger(value) && value >= 0;
  if (question.kind === 'assign') return Array.isArray(value) && [0, 1, 2].every(fate => value.includes(fate));
  return value !== null;
}

function dealCard(label, item) {
  return `<button type="button" class="deal-card" data-item="${item}" aria-pressed="false">
    <span aria-hidden="true">${['🌙', '🍴', '✦'][item]}</span> ${escape(label)}
  </button>`;
}

function bindDeal(question) {
  let selected = null;
  let drag = null;
  let suppressClick = false;
  const board = app.querySelector('.options');
  function select(item) {
    selected = item === selected ? null : item;
    board.querySelectorAll('[data-item]').forEach(card => {
      card.setAttribute('aria-pressed', String(Number(card.dataset.item) === selected));
    });
    board.classList.toggle('is-dealing', selected !== null);
    board.querySelector('#deal-hint').textContent = selected === null
      ? t('拖动卡片，或先点卡片，再点要放的位置。', 'Drag a card, or tap it and then tap a spot.')
      : t(`已选：${question.items[0][selected]}。点一个位置。`, `Selected: ${question.items[1][selected]}. Choose a spot.`);
  }

  function place(item, fate) {
    const values = [...(answers[index] ?? [null, null, null])];
    const occupant = values.indexOf(fate);
    if (occupant !== item) {
      if (occupant >= 0) values[occupant] = values[item];
      values[item] = fate;
    }
    answers[index] = values;
    savePlayer();
    render();
    app.querySelector(`[data-item="${item}"]`)?.focus({ preventScroll: true });
    app.querySelector('#deal-hint').textContent =
      `${question.items[lang][item]} → ${question.options[lang][fate]}`;
  }

  board.addEventListener('click', event => {
    if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
    const card = event.target.closest('[data-item]');
    const slot = event.target.closest('[data-fate]');
    if (slot && selected !== null && (!card || Number(card.dataset.item) !== selected)) {
      place(selected, Number(slot.dataset.fate));
    } else if (card) select(Number(card.dataset.item));
  });
  board.addEventListener('pointerdown', event => {
    const card = event.target.closest('[data-item]');
    if (!card || event.button !== 0 || !event.isPrimary) return;
    suppressClick = false;
    drag = { card, id: event.pointerId, x: event.clientX, y: event.clientY };
    card.setPointerCapture(event.pointerId);
  });
  function targetAt(event) {
    return document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-fate]');
  }
  board.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
    if (!drag.ghost) {
      drag.ghost = document.createElement('div');
      drag.ghost.className = 'deal-card deal-ghost';
      drag.ghost.textContent = drag.card.textContent;
      drag.ghost.setAttribute('aria-hidden', 'true');
      document.body.append(drag.ghost);
    }
    drag.ghost.style.left = event.clientX + 'px';
    drag.ghost.style.top = event.clientY + 'px';
    board.querySelector('.drop-hover')?.classList.remove('drop-hover');
    targetAt(event)?.classList.add('drop-hover');
  });
  function stopDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const { card, ghost } = drag;
    drag = null;
    if (!ghost) return;
    suppressClick = true;
    ghost.remove();
    board.querySelector('.drop-hover')?.classList.remove('drop-hover');
    const target = event.type === 'pointerup' ? targetAt(event) : null;
    if (target) place(Number(card.dataset.item), Number(target.dataset.fate));
  }
  board.addEventListener('pointerup', stopDrag);
  board.addEventListener('pointercancel', stopDrag);
  board.addEventListener('lostpointercapture', stopDrag);
}

function quiz() {
  const q = questions[index];
  const answer = answers[index];
  let input;
  if (q.kind === 'choice') {
    input = q.options[lang].map((option, i) => `<label class="option"><input type="radio" name="answer" value="${i}" ${answer === i ? 'checked' : ''}>${escape(option)}</label>`).join('');
  } else if (q.kind === 'assign') {
    const values = answer ?? [];
    input = `<div class="deal-tray">${q.items[lang].map((item, i) => values[i] == null
      ? dealCard(item, i) : '').join('')}</div>
    <div class="deal-board">${q.options[lang].map((fate, i) => {
      const item = values.indexOf(i);
      const label = item < 0 ? t('放到这里', 'Drop here') : q.items[lang][item];
      return `<div class="deal-slot tone-${i}" data-fate="${i}">
        <button type="button" class="deal-target" data-target="${i}" aria-label="${escape(fate + ' · ' + label)}">
          <strong>${escape(fate)}</strong>${item < 0 ? `<span>${label}</span>` : ''}
        </button>
        ${item < 0 ? '' : dealCard(label, item)}
      </div>`;
    }).join('')}</div>
    <p class="status" id="deal-hint" role="status">${t('拖动卡片，或先点卡片，再点要放的位置。', 'Drag a card, or tap it and then tap a spot.')}</p>`;
  } else if (q.kind === 'number') {
    input = `<input type="number" class="field" id="answer" min="0" step="1" inputmode="numeric" aria-labelledby="title" value="${answer ?? ''}">`;
  } else {
    input = `<input class="field" id="answer" maxlength="100" aria-labelledby="title" placeholder="${t('比如：发圈', 'e.g. Hair ties')}" value="${escape(answer ?? '')}">`;
  }
  const next = q.kind === 'text' && !answer ? t('跳过', 'Skip') : t('继续', 'Continue');
  return `<div class="quizbar"><progress value="${index + 1}" max="8" aria-label="${t('答题进度', 'Quiz progress')}"></progress><span class="steps">${index + 1} / 8</span></div>` +
    frame(`<p class="kicker">${q.title[lang]}</p><h1 id="title">${escape(q.prompt[lang])}</h1>
    <fieldset class="options" aria-labelledby="title">${input}</fieldset>
    <div class="actions">${index ? button('back', t('上一题', 'Back')) : ''}${button('next', next, 'primary')}</div>`, art(q.icon, questionColors[index])) +
    status;
}

function displayAnswer(q, value) {
  if (q.kind === 'assign') return q.items[lang].map((item, i) => `${item} — ${q.options[lang][value[i]]}`).join(' / ');
  if (q.kind === 'choice') return q.options[lang][value];
  return String(value);
}

let resultStyle = 'badge';
let recapPalette = 'lime';


let sharedRecap = false;
const recapPages = ['stat', 'poster', 'guess'];

function resultCards() {
  const ending = [
    t('别说！一个字都别说', 'The ending? Don’t say a word.'),
    t('先给点提示', 'Give me a hint. Keep the ending.'),
    t('快说！我就爱听剧透', 'Tell me the ending. I love spoilers.')
  ][answers[4]];
  const hour = answers[5] == null ? null : answers[5] === 0
    ? t('白送我一小时？我要拿来睡觉。', 'An extra hour? I’m sleeping in.')
    : t('白送我一小时？留到晚上再玩。', 'An extra hour? I’m keeping it for tonight.');
  const tabs = t(`手机里大概开着 ${answers[2]} 个标签页。`, `About ${answers[2]} tabs open on my phone.`);
  const guess = t(`猜猜 ${nickname} 怎么选`, `Guess what ${nickname} picked`);
  return {
    stat: { title: String(answers[2]), lines: [], kicker: t('我手机里的标签页，大概就这么多。', 'About this many tabs open on my phone.') },
    poster: { title: ending, lines: [], kicker: t('朋友问我要不要听剧透，我说：', 'A friend offers to spoil the movie. My answer:') },
    badge: { title: nickname, lines: personalLines(answers, lang), kicker: t('我的答题卡', 'My answer card') },
    guess: { title: guess, lines: questions[0].options[lang], kicker: t('我最爱吃的菜就剩一口了，你问我能不能吃。我会怎么说？', 'You ask for the last bite of my favorite food. What do I say?') }
  };
}

function personal() {
  const { title, lines, kicker } = resultCards()[resultStyle];
  const position = recapPages.indexOf(resultStyle);
  const recapNav = `<nav class="recap-nav" aria-label="${t('回顾翻页', 'Recap pages')}">
    <button type="button" class="button" id="recap-prev" aria-label="${t('上一张', 'Previous card')}" ${position <= 0 ? 'disabled' : ''}>←</button>
    <span>${position < 0 ? t('总览', 'Summary') : `${position + 1} / ${recapPages.length}`}</span>
    <button type="button" class="button" id="recap-next" aria-label="${t('下一张', 'Next card')}" ${position === recapPages.length - 1 ? 'disabled' : ''}>→</button>
  </nav>`;
  const exportView = !sharedRecap && ['badge', 'guess'].includes(resultStyle);
  const palette = exportView ? `<div class="recap-swatches" role="group" aria-label="${t('卡片配色', 'Card colors')}">
    ${Object.entries(recapPalettes).map(([id, [color, zh, en]]) =>
      `<button type="button" data-recap-palette="${id}" aria-label="${t(zh, en)}" aria-pressed="${recapPalette === id}" style="--swatch:${color}"></button>`).join('')}
    </div>` : '';
  return `${exportView || (sharedRecap && resultStyle === 'guess' && (params.has('challenge') || location.hash.startsWith('#challenge='))) ? '' : recapNav}
    ${palette}
    ${exportView ? `<figure class="recap-export ${resultStyle === 'guess' ? 'challenge-preview' : ''}" aria-busy="true"><canvas id="recap-preview" role="img"
      aria-label="${escape([title, kicker, ...lines].join(' · '))}"></canvas><figcaption id="recap-loading">${t('正在生成预览…', 'Preparing preview…')}</figcaption></figure>` :
    `<article class="result-card result-${resultStyle}">
      ${['stat', 'poster'].includes(resultStyle) ? '<span class="result-scribble" aria-hidden="true">✷</span>' : ''}
      <header class="result-identity">${avatarIcon(avatar)}<span>${escape(resultStyle === 'badge' ? kicker : nickname)}</span></header>
      <h1>${escape(title)}</h1>
      ${resultStyle === 'badge' ? '' : `<p>${escape(kicker)}</p>`}
      ${lines.length ? `<ol class="result-lines">${lines.map((line, i) =>
        `<li><span aria-hidden="true">${resultStyle === 'guess' ? 'ABC'[i] : ['↗', '☾', '✦'][i]}</span>${escape(line)}</li>`).join('')}</ol>` : ''}
      <footer>${escape(packName())} <span>✿ Little Things</span></footer>
    </article>`}
    ${sharedRecap ? `<div class="actions"><a href="./">${t('我也来答', 'Play Little Things')}</a></div>` :
    `<div class="actions">${exportView && resultStyle !== 'guess'
      ? button('save-recap', t('保存图片', 'Save image'))
      : resultStyle === 'guess' ? '' : button('open-summary', t('查看分享长图', 'Preview share image'))}
      ${roster.count > 1 ? button('group', t('看看大家怎么答', 'See everyone’s answers'), 'primary')
        : button('share-personal', t('分享给好友', 'Share with friends'), 'primary')}</div>
      ${exportView ? `<p class="sub recap-note">${resultStyle === 'guess'
      ? t('点开链接看题，回我 A、B 或 C。', 'Open the link to see the choices, then reply A, B or C.')
      : t('长图包含昵称、头像和卡片上的三条答案。', 'The image includes your nickname, avatar and the three answers shown.')}</p>` : ''}
      ${['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname) ? `<p class="sub recap-note">${t('这是本地预览，二维码需要公开网址才能在别人的手机上打开。', 'This is a local preview. The QR needs a public URL to open on another device.')}</p>` : ''}`}${status}`;

}

// The card is picked from all eight answers now, so the link carries all eight.
// Links in the older five-field shape still open; they show the tab-count card,
// which is all they ever had the data for.
function recapLink() {
  const url = new URL(location.pathname, location.origin);
  url.hash = 'recap=' + encodeURIComponent(JSON.stringify([lang, nickname, avatar, answers]));
  return url.href;
}

// Anything arriving in a URL is a stranger's input, so check its shape before
// letting it reach the card. Text is escaped at render.
function validSharedAnswers(value) {
  const choice = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
  return Array.isArray(value) && value.length === 8 &&
    choice(value[0], 2) && choice(value[1], 2) &&
    Number.isSafeInteger(value[2]) && value[2] >= 0 && value[2] <= 100000 &&
    Array.isArray(value[3]) && value[3].length === 3 &&
    [0, 1, 2].every(fate => value[3].includes(fate)) &&
    choice(value[4], 2) && choice(value[5], 1) && choice(value[6], 2) &&
    typeof value[7] === 'string' && value[7].length <= 100;
}

function openSharedRecap() {
  if ((params.has('challenge') || location.hash.startsWith('#challenge='))) {
    try {
      const [locale, name, icon] = JSON.parse(params.get('challenge') ?? decodeURIComponent(location.hash.slice(11)));
      if (![0, 1].includes(locale) || typeof name !== 'string' || !name.trim() || name.length > 24 ||
          !Number.isInteger(icon) || !avatars[icon]) return false;
      lang = locale;
      nickname = name;
      avatar = icon;
      resultStyle = 'guess';
      sharedRecap = true;
      show('personal');
      return true;
    } catch { return false; }
  }
  if (!location.hash.startsWith('#recap=')) return false;
  try {
    const data = JSON.parse(decodeURIComponent(location.hash.slice(7)));
    if (!Array.isArray(data) || ![4, 5, 6].includes(data.length)) return false;
    const [locale, name, icon, ...rest] = data;
    if (![0, 1].includes(locale) || typeof name !== 'string' || !name.trim() || name.length > 24 ||
        !Number.isInteger(icon) || !avatars[icon]) return false;
    const full = rest.length === 1 && validSharedAnswers(rest[0]);
    if (!full) {
      const [tabs, spoiler, hour] = rest;
      if (!Number.isSafeInteger(tabs) || tabs < 0 || ![0, 1, 2].includes(spoiler) ||
          (hour !== undefined && ![0, 1].includes(hour))) return false;
      answers[2] = tabs;
      answers[4] = spoiler;
      answers[5] = hour;
    } else {
      answers = rest[0];
    }
    lang = locale;
    nickname = name;
    avatar = icon;
    resultStyle = full ? 'badge' : 'stat';
    sharedRecap = true;
    show('personal');
    return true;
  } catch {
    return false;
  }
}

async function drawRecapPreview(canvas, challenge = false) {
  const fill = recapPalettes[recapPalette][0];
  const layout = 'comic';
  const link = recapLink();
  const save = document.getElementById(canvas.id === 'challenge-thumbnail' ? 'copy-challenge' : 'save-recap');
  if (save) save.disabled = true;
  canvas.width = challenge ? 1200 : 900;
  canvas.height = challenge ? 630 : 1200;
  const ctx = canvas.getContext('2d');
  const ink = '#1e2814';
  const family = getComputedStyle(document.body).fontFamily;
  function write(text, x, y, size, weight = 700, max = 804, alignCenter = false) {
    ctx.font = `${weight} ${size}px ${text === "✿ Little Things" ? "Bricolage Grotesque, sans-serif" : family}`;
    const segmenter = new Intl.Segmenter(lang === 0 ? 'zh' : 'en', { granularity: 'word' });
    const lines = [];
    let line = '';
    for (const { segment } of segmenter.segment(text)) {
      if (line.trim() && ctx.measureText(line + segment).width > max &&
          (lang !== 0 || (!/^[，。！？、；：）】》」』]/u.test(segment) && !/[（【《「『]$/u.test(line)))) {
        lines.push(line.trim());
        line = '';
      }
      line += segment;
    }
    lines.push(line.trim());
    let top = Infinity;
    let bottom = -Infinity;
    ctx.fillStyle = ink;
    lines.forEach((content, i) => {
      const baseline = y + i * size * 1.18;
      const metrics = ctx.measureText(content);
      top = Math.min(top, baseline - metrics.actualBoundingBoxAscent);
      bottom = Math.max(bottom, baseline + metrics.actualBoundingBoxDescent);
    });
    const offset = alignCenter ? y - (top + bottom) / 2 : 0;
    lines.forEach((content, i) => {
      ctx.fillText(content, x, y + offset + i * size * 1.18, max);
    });
    return { top: top + offset, bottom: bottom + offset };
  }
  try {
    await document.fonts.load(`800 48px ${family}`, lang === 0 ? '关于我的三件小事' : 'Little Things');
    await document.fonts.ready;
    await avatarImages[avatar].decode();
    if (!canvas.isConnected) return;
    if (challenge) {
      drawChallengeCover(ctx, fill, ink, write);
    } else {
      const qr = await createImageBitmap(await (await fetch(await qrDataUrl(link))).blob());
      if (canvas.isConnected) drawRoundPoster(ctx, qr, fill, layout, ink, write);
      qr.close();
    }
    if (!canvas.isConnected) return;
    canvas.closest('figure').setAttribute('aria-busy', 'false');
    canvas.parentElement.querySelector('figcaption').hidden = true;
    if (save) save.disabled = false;
  } catch {
    if (canvas.isConnected) {
      canvas.parentElement.querySelector('figcaption').textContent = t('预览加载失败，请重试。', 'Couldn’t load the preview. Try again.');
      canvas.closest('figure').setAttribute('aria-busy', 'false');
      if (save && canvas.id === 'challenge-thumbnail') save.disabled = false;
      else if (save) {
        save.textContent = t('重试预览', 'Retry preview');
        save.disabled = false;
        save.onclick = () => render();
      }
    }
  }
}

function drawRoundPoster(ctx, qr, fill, layout, ink, write) {
  const left = 60;
  const right = 840;
  const width = right - left;
  const paper = '#fffdf6';
  // The same three findings as the card, in the same order, but in their short
  // form: this canvas draws big text that does not wrap inside fixed panels.
  const picked = personalPanels(answers, lang);
  while (picked.length < 3) picked.push({ prompt: packName(), reply: t('八道题', 'Eight questions') });
  const prompts = picked.map(panel => panel.prompt);
  const replies = picked.map(panel => panel.reply);
  function block(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  function rule(y) { block(left, y, width, 3, ink); }
  function dots(x, y, w, h) {
    ctx.fillStyle = ink;
    for (let dy = 0; dy < h; dy += 18) {
      for (let dx = 0; dx < w; dx += 18) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, 2.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (layout === 'comic') {
    drawComicCover(ctx, qr, fill, ink, prompts, replies, write);
    return;
  }
  block(0, 0, 900, 1200, fill);
  write('✿ Little Things', left, 73, 29, 800);
  centerAvatar(ctx, avatar, right - 27, 66, 58);
  rule(108);
  write(t(`关于${nickname}的三件小事`, `Three things about ${nickname}`), left, 168, 44, 800, 645);
  dots(728, 136, 112, 80);
  ctx.save();
  ctx.translate(746, 175);
  ctx.rotate(-.18);
  block(-30, -35, 68, 64, paper);
  write('✷', -23, 20, 55, 800, 54);
  ctx.restore();

  const order = [0, 1, 2];
  order.forEach((i, row) => {
    const top = 244 + row * 242;
    if (layout === 'stack') {
      block(left, top, 72, 186, ink);
      ctx.save();
      ctx.fillStyle = fill;
      ctx.font = `800 33px ${getComputedStyle(document.body).fontFamily}`;
      ctx.fillText(String(row + 1).padStart(2, '0'), left + 16, top + 54);
      ctx.restore();
    } else {
      rule(top);
      write(String(row + 1).padStart(2, '0'), left, top + 69, 40, 800, 68);
      dots(right - 70, top + 148, 75, 51);
    }
    const x = left + 99;
    write(prompts[i], x, top + 52, 30, 700, right - x);
    write(replies[i], x, top + 127, layout === 'stack' ? 54 : 60, 800, right - x - 82);
  });

  rule(992);
  const qrModules = qr.width / 7;
  const qrSize = Math.floor(150 / qrModules) * qrModules;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, right - qrSize, 1022, qrSize, qrSize);
  write(t('扫码看我的答案', 'Scan to view the recap'), left, 1061, 29, 800, 560);
  write(packName(), left, 1101, 24, 700, 560);
  write(t('八道题，换你来选。', 'Eight questions to play with friends.'), left, 1136, 23, 600, 560);
}

function centerAvatar(ctx, avatarId, x, y, size) {
  ctx.drawImage(avatarImages[avatarId], x - size / 2, y - size / 2, size, size);
}

function drawChallengeCover(ctx, fill, ink, write) {
  const paper = '#fffdf6';
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, 1200, 630);
  for (let x = 870; x < 1200; x += 26) {
    ctx.fillStyle = ink;
    ctx.globalAlpha = .12 + .78 * (x - 870) / 330;
    for (let y = 26; y < 430; y += 26) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  write('✿ Little Things', 52, 73, 37, 800);
  write(t('最后一口，我舍得给你吗？', 'Would I give you the last bite?'), 52, 253, 88, 800, 765);

  ctx.save();
  ctx.translate(991, 263);
  ctx.rotate(.07);
  ctx.fillStyle = ink;
  ctx.fillRect(-126 + 10, -126 + 12, 252, 252);
  ctx.fillStyle = paper;
  ctx.fillRect(-126, -126, 252, 252);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.strokeRect(-126, -126, 252, 252);
  centerAvatar(ctx, avatar, 0, 0, 151);
  ctx.restore();

  ctx.beginPath();
  for (let i = 0; i < 20; i++) {
    const angle = i * Math.PI / 10 - Math.PI / 2;
    const radius = i % 2 ? 43 : 62;
    const x = 1093 + Math.cos(angle) * radius;
    const y = 136 + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  write('?', 1075, 156, 58, 800);

  const labels = lang === 0 ? ['全给你', '一人一半', '留给自己'] : ['Give it to you', 'Split it', 'Keep it'];
  const widths = [314, 211, 211];
  let x = 52;
  labels.forEach((label, i) => {
    const width = widths[i];
    ctx.fillStyle = ink;
    ctx.fillRect(x + 7, 482 + 8, width, 77);
    ctx.fillStyle = paper;
    ctx.fillRect(x, 482, width, 77);
    ctx.lineWidth = 4;
    ctx.strokeRect(x, 482, width, 77);
    ctx.beginPath();
    ctx.arc(x + 41, 521, 22, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
    write('ABC'[i], x + 32, 529, 24, 800);
    write(label, x + 80, 533, 31, 800, width - 94);
    x += width + 22;
  });
  ctx.beginPath();
  ctx.roundRect(906, 546, 294, 84, [34, 0, 0, 0]);
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.font = '800 30px Bricolage Grotesque, PingFang SC, sans-serif';
  ctx.fillText(t('点开来猜 →', 'Take a guess →'), 940, 597, 234);
}

function drawComicCover(ctx, qr, fill, ink, prompts, replies, write) {
  const edge = '#1d2b16';
  const paper = '#fffdf6';
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, 900, 1200);

  for (const [x, y, columns, rows, reverse] of [[550, 188, 16, 15, false], [2, 694, 17, 12, true]]) {
    ctx.fillStyle = edge;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        ctx.globalAlpha = .11 + .55 * (reverse ? 1 - column / columns : column / columns);
        ctx.beginPath();
        ctx.arc(x + column * 24, y + row * 24, 4.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  write('✿ Little Things', 50, 82, 33, 800);
  const heading = write(t(`关于${nickname}的三件小事`, `Three things about ${nickname}`), 50, lang === 0 ? 188 : 174, lang === 0 ? 56 : 64, 800, 577, lang === 0);

  const panels = [
    { answer: 0, x: 52, y: 294, width: 730, height: lang === 0 ? 186 : 239, tilt: -.022, wrap: true },
    { answer: 1, x: 166, y: lang === 0 ? 522 : 571, width: 681, height: 178, tilt: .018 },
    { answer: 2, x: 53, y: lang === 0 ? 750 : 803, width: 635, height: 178, tilt: -.016 }
  ];
  const font = getComputedStyle(document.body).fontFamily;
  // Scaling the size by the width ratio only estimates: glyph widths are not
  // linear in font size, so the estimate lands a few pixels over often enough
  // that the line wraps and spills out of a fixed-height panel. Measure it.
  function fitLine(text, x, y, size, max, minimum = 22) {
    ctx.font = `800 ${size}px ${font}`;
    let fitted = Math.max(minimum, Math.min(size, Math.floor(size * max / ctx.measureText(text).width)));
    ctx.font = `800 ${fitted}px ${font}`;
    while (fitted > minimum && ctx.measureText(text).width > max) {
      fitted -= 1;
      ctx.font = `800 ${fitted}px ${font}`;
    }
    write(text, x, y, fitted, 800, max);
  }

  for (const { answer, x, y, width, height, tilt, wrap } of panels) {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(tilt);
    ctx.translate(-width / 2, -height / 2);
    ctx.beginPath();
    ctx.roundRect(9, 11, width, height, 8);
    ctx.fillStyle = edge;
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 8);
    ctx.fillStyle = paper;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 5;
    ctx.stroke();
    fitLine(prompts[answer], 32, 52, 27, width - 64);
    if (lang === 0) fitLine(replies[answer], 32, 128, 59, width - 64, 32);
    else if (wrap) write(replies[answer], 32, 123, 63, 800, width - 64);
    else fitLine(replies[answer], 32, 133, 70, width - 64, 32);
    ctx.restore();
  }

  // Draw the avatar last so the badge overlaps the headline panel.
  const badgeX = 766;
  const badgeY = (heading.top + heading.bottom) / 2;
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12 - Math.PI / 2;
    const radius = i % 2 ? 79 : 96;
    const x = badgeX + Math.cos(angle) * radius;
    const y = badgeY + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, 65, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
  centerAvatar(ctx, avatar, badgeX, badgeY, 112);

  const modules = qr.width / 7;
  const qrSize = Math.floor(124 / modules) * modules;
  const qrX = 846 - qrSize;
  const first = write(t('扫码看我的答案', 'Scan to view the recap'), 50, lang === 0 ? 1018 : 1058, 33, 800, 590);
  write(packName(), 50, lang === 0 ? 1055 : 1095, 24, 800, 590);
  const last = write(t('八道题，换你来选。', 'Eight questions to play with friends.'), 50, lang === 0 ? 1090 : 1130, 23, 700, 590);
  const qrY = Math.round((first.top + last.bottom - qrSize) / 2);
  ctx.fillStyle = edge;
  ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
}

function challengeLink() {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('challenge', JSON.stringify([lang, nickname, avatar]));
  return url.href;
}

async function saveRecapImage() {
  if (resultStyle === 'guess') {
    const link = challengeLink();
    try {
      await navigator.clipboard.writeText(link);
      message(t('猜题链接已复制。', 'Challenge link copied.'));
    } catch { message(link); }
    return;
  }
  const canvas = document.getElementById('recap-preview');
  if (canvas.closest('figure').getAttribute('aria-busy') !== 'false' || !canvas.parentElement.querySelector('figcaption').hidden) return;
  const download = document.createElement('a');
  download.href = canvas.toDataURL('image/png');
  download.download = 'little-things-recap.png';
  download.click();
  message(t('图片已生成。', 'Image ready.'));
}

async function copyResult() {
  const { title, lines, kicker } = resultCards()[resultStyle];
  const choices = lines.map((line, i) => resultStyle === 'guess' ? `${'ABC'[i]}. ${line}` : `• ${line}`);
  const text = [title, kicker, ...choices, packName() + ' · Little Things'].join('\n');
  try {
    await navigator.clipboard.writeText(text);
    message(t('文案已复制。', 'Card text copied.'));
  } catch {
    message(t('复制失败，可以长按卡片文字复制。', 'Couldn’t copy. Select the card text to copy it.'));
  }
}

function conversationStarter(submissions) {
  const spoilers = submissions.map(entry => entry.answers[4]);
  const split = spoilers.includes(0) && spoilers.includes(2);
  const ask = split
    ? t('有人想直接听结局，有人一个字都不想听。那预告片放到哪一步，你会觉得它剧透了？',
        'Some of you want the whole ending. Others don’t want a word. How much can a trailer show before it spoils the movie?')
    : t('多出来的那一小时，你会怎么花？说说你的第一件事。',
        'Picture that extra hour. What’s the first thing you’d do with it?');
  return `<aside class="conversation"><h2>${t('接着聊', 'Keep talking')}</h2><p>${ask}</p></aside>`;
}

function playerChip(player) {
  return `<span class="player-chip">${avatarIcon(player.avatar)}${escape(player.nickname)}</span>`;
}

function groupComparison(question, index, players, position) {
  const entries = players.map(player => ({ player, value: player.answers[index] }))
    .filter(({ value }) => value !== '' && value != null);
  if (!entries.length) return '';
  const title = `<h2><span class="group-index">${position}</span>${escape(question.title[lang])}</h2><p class="sub">${escape(question.prompt[lang])}</p>`;
  if (players.length === 2 && ['choice', 'text'].includes(question.kind)) {
    const same = question.kind !== 'text' && entries.length === 2 &&
      JSON.stringify(entries[0].value) === JSON.stringify(entries[1].value);
    return `<section class="group-question">${title}
      <div class="pair-grid">${players.map((player, side) => {
        const value = player.answers[index];
        return `<div class="pair-side side-${side}">${playerChip(player)}
          <strong>${escape(value === '' || value == null ? t('跳过', 'Skipped') : displayAnswer(question, value))}</strong></div>`;
      }).join('')}</div>${same ? `<p class="group-match">✦ ${t('这题选得一样', 'Same answer')}</p>` : ''}</section>`;
  }
  if (question.kind === 'choice') {
    const buckets = question.options[lang].map((option, i) =>
      ({ option, people: entries.filter(entry => entry.value === i).map(entry => entry.player), i }))
      .filter(({ people }) => people.length);
    return `<section class="group-question">${title}
      <div class="vote-strip" aria-hidden="true">${buckets.map(({ people, i }) =>
        `<span class="side-${i}" style="flex-grow:${people.length}">${people.length}</span>`).join('')}</div>
      <div class="vote-legend">${buckets.map(({ option, people, i }) => `<div class="vote-bucket side-${i}">
        <div class="vote-heading"><strong>${escape(option)}</strong><span>${people.length}/${entries.length}</span></div><div class="player-list">${people.map(playerChip).join('')}</div>
      </div>`).join('')}</div></section>`;
  }
  if (question.kind === 'assign') {
    return `<section class="group-question">${title}<div class="fate-matrix">
      <div class="fate-grid">${question.options[lang].map((fate, i) =>
        `<strong class="side-${i}">${escape(fate)}</strong>`).join('')}</div>
      ${question.items[lang].map((item, j) => `<div class="fate-row"><h3>${escape(item)}</h3>
        <div class="fate-grid">${question.options[lang].map((fate, i) => {
          const people = entries.filter(entry => entry.value[j] === i).map(entry => entry.player);
          return `<div class="side-${i}" aria-label="${escape(fate)}">${people.length ? people.map(playerChip).join('') : '—'}</div>`;
        }).join('')}</div></div>`).join('')}</div></section>`;
  }
  const ordered = question.kind === 'number' ? entries.slice().sort((a, b) => b.value - a.value) : entries;
  const max = question.kind === 'number' ? Math.max(1, ...ordered.map(entry => entry.value)) : 1;
  return `<section class="group-question">${title}<div class="group-replies ${question.kind === 'number' ? 'number-replies' : ''}">${ordered.map(({ player, value }) =>
    `<div class="group-reply">${playerChip(player)}<strong>${escape(value)}</strong>
      ${question.kind === 'number' ? `<div class="number-track" aria-hidden="true"><span style="width:${value / max * 100}%"></span></div>` : ''}</div>`).join('')}</div></section>`;
}

function group() {
  const { submissions } = roster;
  const choices = questions.map((question, i) => ({ question, i }))
    .filter(({ question }) => question.kind === 'choice');
  const shared = choices.filter(({ i }) => submissions.length > 1 && submissions.every(player => player.answers[i] === submissions[0].answers[i])).length;
  const ready = submissions.length > 1;
  const summary = ready ? `<div class="group-score">
    <div><strong>${shared}/${choices.length}</strong><span>${t('选择题全员一致', 'single-choice picks in common')}</span></div>
    <div><strong>${choices.length - shared}</strong><span>${t('题有分歧', 'split decisions')}</span></div>
    <div class="player-list">${submissions.map(playerChip).join('')}</div></div>` : '';
  const order = [4, 2, 3, 0, 5, 1, 6, 7].filter(i => submissions.some(player => player.answers[i] !== '' && player.answers[i] != null));
  return `<section class="room-reveal"><h1>${t('这一局，大家怎么选？', 'The room reveal')}</h1>
    <p class="room-count">${t(`已提交：${roster.count} 人`, `${roster.count} submitted`)}</p>${summary}
    ${ready ? conversationStarter(submissions) + order.map((i, position) => groupComparison(questions[i], i, submissions, position + 1)).join('')
      : `<p class="sub">${t('你已经答完了。等至少一位朋友交卷，这里就会显示你们的答案。', 'You’ve finished. Once at least one friend submits, your answers will appear here.')}</p>`}
    <div class="actions">${button('mine', t('我的结果', 'My result'))}${button('group', t('刷新', 'Refresh'))}</div>${status}</section>`;
}

const packName = () => t('日常小事', 'Everyday Dilemmas');

function render() {
  if (debug) document.querySelector('.brand').href = '?debug=1';
  document.documentElement.lang = t('zh-CN', 'en');
  headerShare.textContent = t('分享', 'Share');
  language.textContent = t('English', '中文');
  const countTag = `<span class="pack-count">${t(`${questions.length} 道题`, `${questions.length} questions`)}</span>`;
  if (screen === 'home') {
    app.innerHTML = frame(`<h1>${packName()}</h1>
      <p class="sub">${t('无聊的小事也有意想不到的答案。', 'A game to get to know each other through questions you’d never think to ask.')}</p>
      <div class="actions">${button('start', t('开始答题', 'Start Quiz'), 'primary')}</div>${status}`, `<div class="art hero-art"><img src="./party-die.png" alt="">${countTag}</div>`, 'hero');
    linkAction('start', () => start());
  } else if (screen === 'quiz') {
    app.innerHTML = quiz();
    const q = questions[index];
    const next = document.getElementById('next');
    next.disabled = !valid(q, answers[index]);
    app.querySelector('.options').addEventListener('input', event => {
      const field = event.target;
      if (q.kind === 'choice') answers[index] = Number(field.value);
      else if (q.kind === 'number') answers[index] = field.value === '' || !Number.isSafeInteger(field.valueAsNumber) || field.valueAsNumber < 0 ? null : field.valueAsNumber;
      else {
        answers[index] = field.value;
        next.textContent = field.value.trim() ? t('继续', 'Continue') : t('跳过', 'Skip');
      }
      next.disabled = !valid(q, answers[index]);
      savePlayer();
    });
    if (q.kind === 'assign') bindDeal(q);
    linkAction('next', () => {
      if (!valid(q, answers[index])) return;
      if (q.kind === 'text') answers[index] = (answers[index] ?? '').trim();
      savePlayer();
      if (index === questions.length - 1) show('submit');
      else { index += 1; show('quiz'); }
    });
    linkAction('back', () => { index -= 1; show('quiz'); });
  } else if (screen === 'submit') {
    app.innerHTML = frame(`<h1>${t('朋友怎么称呼你？', 'What should friends call you?')}</h1>
      <p class="sub">${t('提交后，房间里答完的人可以看到你的昵称和答案。', 'After you submit, friends who finish can see your nickname and answers.')}</p>
      <form class="options" id="submit"><label class="stack">${t('昵称', 'Nickname')}<input class="field" name="nickname" maxlength="24" required value="${escape(nickname)}"></label>
      ${avatarPicker()}
      <div class="actions">${button('back', t('上一题', 'Back'))}<button class="button primary" type="submit">${t('提交并看结果', 'Submit and see my result')}</button></div></form>${status}`, art('✿'));
    linkAction('back', () => show('quiz'));
    const form = document.getElementById('submit');
    form.addEventListener('input', () => { nickname = form.elements.nickname.value; avatar = Number(form.elements.avatar.value); savePlayer(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      nickname = form.elements.nickname.value.trim();
      if (!nickname || busy) return;
      if (debug) return show('personal');
      busy = true;
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        await api('/' + room, 'POST', { nickname, answers, token, avatar });
        savePlayer();
        roster = await api('/' + room).catch(() => ({ count: 1, submissions: [] }));
        show('personal');
      } catch {
        message(t('没提交成功，再试一次。', 'Couldn’t submit. Try again.'));
        submit.disabled = false;
      } finally { busy = false; }
    });
  } else if (screen === 'personal') {
    app.innerHTML = personal();
    const canvas = document.getElementById('recap-preview');
    if (canvas) drawRecapPreview(canvas);
    linkAction('save-recap', saveRecapImage);
    linkAction('open-summary', () => { resultStyle = 'badge'; show('personal'); });
    for (const control of app.querySelectorAll('[data-recap-palette]')) {
      control.addEventListener('click', () => {
        recapPalette = control.dataset.recapPalette;
        render();
        app.querySelector(`[data-recap-palette="${recapPalette}"]`).focus();
      });
    }
    function turn(offset) {
      const position = recapPages.indexOf(resultStyle);
      resultStyle = recapPages[position < 0 ? 0 : position + offset];
      show('personal');
    }
    linkAction('recap-prev', () => turn(-1));
    linkAction('recap-next', () => turn(1));
  }
  else if (screen === 'group') app.innerHTML = group();
  else app.innerHTML = frame(`<h1>${t('找不到这个房间', 'Room not found')}</h1><div class="actions"><a href="./">${t('回首页', 'Back to home')}</a></div>`);
  app.querySelector('h1')?.setAttribute('tabindex', '-1');
  const sharePersonal = document.getElementById('share-personal');
  if (sharePersonal) sharePersonal.onclick = openShare;
  linkAction('mine', () => show('personal'));
  linkAction('group', async () => {
    if (debug) return show('group');
    try {
      roster = await api('/' + room);
      show('group');
    } catch { message(t('没拿到房间结果，再试一次。', 'Couldn’t load the room. Try again.')); }
  });
}

headerShare.addEventListener('click', openShare);

language.addEventListener('click', () => {
  lang = 1 - lang;
  if (!debug) localStorage.setItem('little-things-language', t('zh', 'en'));
  render();
});

const demoAnswers = [1, 2, 23, [0, 2, 1], 0, 0, 1, '发圈'];

function preview(page) {
  answers = structuredClone(demoAnswers);
  nickname = 'Mia';
  avatar = 1;
  roster = { count: 2, submissions: [
    { nickname, avatar, answers: structuredClone(answers) },
    { nickname: 'Alex', avatar: 4, answers: [2, 1, 7, [2, 1, 0], 2, 1, 0, 'Keys'] }
  ] };
  if (page.startsWith('q')) {
    roster = { count: 0, submissions: [] };
    index = Number(page.slice(1));
    answers[index] = null;
    show('quiz');
  } else {
    index = questions.length - 1;
    if (['waiting', 'personal', 'home', 'submit'].includes(page)) roster = { count: 1, submissions: roster.submissions.slice(0, 1) };
    if (page === 'crowd') {
      roster.submissions.push(
        { nickname: 'Jo', avatar: 0, answers: [1, 2, 15, [0, 1, 2], 1, 1, 2, ''] },
        { nickname: 'Sam', avatar: 5, answers: [0, 1, 34, [2, 0, 1], 0, 1, 0, 'Pens'] },
        { nickname: 'Kai', avatar: 2, answers: [2, 2, 0, [1, 2, 0], 2, 0, 2, 'Socks'] }
      );
      roster.count = roster.submissions.length;
    }
    show(['waiting', 'crowd'].includes(page) ? 'group' : page === 'personal-ready' ? 'personal' : page);
  }
}

function setupPreview() {
  const panel = document.createElement('details');
  panel.className = 'debug-panel';
  panel.open = true;
  const pages = [
    ['home', '首页'], ...questions.map((q, i) => ['q' + i, `${i + 1}. ${q.title[0]}`]),
    ['submit', '昵称与头像'], ['personal', '个人结果 · 好友未交卷'], ['personal-ready', '个人结果 · 好友已交卷'], ['waiting', '群体结果 · 仅自己交卷'], ['group', '双人结果'], ['crowd', '五人结果'], ['missing', '房间失效']
  ];
  panel.innerHTML = `<summary>Demo · 页面预览</summary>
    <div class="preview-nav"><button type="button" class="button" id="preview-prev" aria-label="上一页" title="上一页（←）">←</button>
    <select aria-label="跳到页面" class="field" id="preview-page">${pages.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select>
    <button type="button" class="button" id="preview-next" aria-label="下一页" title="下一页（→）">→</button></div>
    <a href="./">退出预览</a>`;
  app.before(panel);
  const picker = panel.querySelector('select');
  picker.addEventListener('change', () => preview(picker.value));
  function step(direction) {
    const target = pages[picker.selectedIndex + direction];
    if (target) preview(target[0]);
  }
  panel.querySelector('#preview-prev').addEventListener('click', () => step(-1));
  panel.querySelector('#preview-next').addEventListener('click', () => step(1));
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
        event.shiftKey || event.target.closest('input, textarea, select, [contenteditable], [role="radio"]')) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    step(event.key === 'ArrowLeft' ? -1 : 1);
  });
  preview('home');
}

let checkingRoom = false;
async function refreshPersonalCount() {
  if (checkingRoom || debug || sharedRecap || !room || screen !== 'personal' || document.hidden) return;
  checkingRoom = true;
  try {
    const current = await api('/' + room);
    if (screen !== 'personal' || current.count === roster.count) return;
    roster = current;
    const action = document.getElementById('share-personal');
    if (action && roster.count > 1) {
      action.textContent = t('看看大家怎么答', 'See everyone’s answers');
      action.id = 'group';
      action.onclick = () => show('group');
    }
  } catch {
    // Keep the current action when the room cannot be reached.
  } finally { checkingRoom = false; }
}
window.setInterval(refreshPersonalCount, 10000);
document.addEventListener('visibilitychange', refreshPersonalCount);

async function initialize() {
  if (openSharedRecap()) return;
  resultStyle = 'badge';
  if (debug) return setupPreview();
  if (!roomParam) return render();
  if (!room) return show('missing');
  loadPlayer();
  try {
    roster = await api('/' + room);
    show(roster.submissions.length ? 'personal' : 'quiz');
  } catch { show('missing'); }
}
initialize();
