import { mountPageScatter } from './page-scatter.js';
import { questions as currentQuestions, legacyQuestions } from './questions.js';
let questions = currentQuestions;
const usePackVersion = version => { questions = version === 2 ? currentQuestions : legacyQuestions; };
import { createRoom, joinRoom, readRoom, submitAnswers, unlockExampleSpot, qrDataUrl } from './storage.js';
import { personalLines, personalPanels } from './triggers.js';

mountPageScatter();

const app = document.querySelector('#app');
const language = document.querySelector('#language');
const params = new URLSearchParams(location.search);
const debug = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && params.get('debug') === '1';
const roomParam = params.get('room');
let room = /^[a-f0-9]{24}$/.test(roomParam ?? '') ? roomParam : null;
let lang = localStorage.getItem('little-things-language') === 'zh' ? 0 : 1;
let screen = 'home';
let index = 0;
let roster = { count: 0, joined: 0, capacity: 5, submissions: [] };
const resultsReady = () => roster.submissions.length >= 2;
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
const quizStickerColors = [
  '#ffdae7', '#ffe1ba', '#dbe9ff', '#e9ddff',
  '#fff0b4', '#d5f3f5', '#daf4e0', '#ffdcd4'
];
const paletteColor = name => recapPalettes[name]?.[0] ?? recapPalettes.orange[0];
const cornerSticker = (icon, color) =>
  `<span class="sticker corner-sticker" style="--sticker-fill:${color}" aria-hidden="true">${icon}</span>`;
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

function loadPlayer() {
  const key = 'little-things:' + room;
  let player = {};
  try { player = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
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
    picker.value = next === 'quiz' ? 'q' + index : next === 'personal' && roster.joined > 1 ? (resultsReady() ? (roster.count < roster.joined ? 'personal-partial' : 'personal-ready') : 'waiting') : next === 'group' ? (roster.count < roster.joined ? 'group-partial' : roster.count > 2 ? 'crowd' : 'group') : next;
    document.getElementById('preview-prev').disabled = picker.selectedIndex === 0;
    document.getElementById('preview-next').disabled = picker.selectedIndex === picker.options.length - 1;
  }
  render();
  window.scrollTo(0, 0);
  app.querySelector('h1')?.focus({ preventScroll: true });
}

async function start() {
  if (debug) {
    index = 0;
    roster = { count: 0, joined: 1, capacity: 5, submissions: [] };
    return show('quiz');
  }
  if (busy) return;
  busy = true;
  const control = document.getElementById('start');
  if (control) control.disabled = true;
  try {
    if (!room) {
      room = await createRoom();
      history.replaceState(null, '', '?room=' + room);
      loadPlayer();
    }
    const { joined } = await joinRoom(room, token);
    if (!joined) {
      await refreshRoom().catch(() => {});
      message(t('这局已经满员了。', 'This round is full.'));
      return;
    }
    roster = await readRoom(room, token);
    usePackVersion(roster.packVersion);
    if (roster.submitted) show('personal');
    else show('quiz');
  } catch {
    message(t('没能开始答题，再试一次。', 'Couldn’t start the quiz. Try again.'));
  } finally {
    busy = false;
    if (control) control.disabled = false;
  }
}

const headerShare = document.querySelector('#header-share');

function roomPanel({ recap = false } = {}) {
  return `<section class="round-panel" aria-label="${t('本局', 'This round')}">
    <div class="round-summary">
      <p class="round-counts" id="round-counts" role="status"></p>
      ${recap ? `<button type="button" class="button recap-save" id="save-recap" aria-label="${t('保存图片', 'Save image')}" disabled>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>
        </svg><span>${t('保存图片', 'Save image')}</span>
      </button>` : ''}
    </div>
    <div class="round-actions${recap ? ' recap-actions' : ''}">
      ${recap ? button('group', t('查看群体结果', 'See group results'), 'primary') : ''}
      ${button('copy-invite', t('复制邀请链接', 'Copy invite link'))}
    </div>
    <p class="status" id="invite-status" role="status"></p>
  </section>`;
}

function updateRoomPanel() {
  const count = document.getElementById('round-counts');
  if (!count) return;
  const { joined, capacity, count: submitted } = roster;
  const spots = Math.max(0, capacity - joined);
  const spotsLeft = t(`还剩 ${spots} 个位置`, `${spots} ${spots === 1 ? 'spot' : 'spots'} left`);
  const friends = Math.max(0, joined - 1);
  const players = friends === 0 ? t('只有你', 'Just you')
    : t(`你和 ${friends} 位好友`, `You + ${friends} ${friends === 1 ? 'friend' : 'friends'}`);
  const waiting = joined - submitted;
  const submittedProgress = t(`已交卷 ${submitted}/${joined}`, `${submitted} of ${joined} submitted`);
  const recapProgress = waiting <= 0 ? t('大家都交卷了', 'Everyone’s submitted')
    : resultsReady() ? submittedProgress
      : t(`还有 ${waiting} 位好友没交卷`, `Waiting for ${waiting} ${waiting === 1 ? 'friend' : 'friends'} to submit`);
  const groupProgress = document.getElementById('group-progress');
  if (groupProgress && groupProgress.textContent !== submittedProgress) groupProgress.textContent = submittedProgress;
  const label = screen === 'invite'
    ? `${t('好友已在这局', 'A friend is already in this round')} · ${spotsLeft}`
    : screen === 'personal'
      ? (joined <= 1 ? spotsLeft : `${recapProgress}\n${spotsLeft}`)
      : `${players} · ${spotsLeft}`;
  if (count.textContent !== label) count.textContent = label;
  const copy = document.getElementById('copy-invite');
  const results = document.getElementById('group');
  if (copy) {
    copy.classList.toggle('primary', spots === 0 || screen === 'group' || (screen === 'personal' && joined === 1));
    const label = spots === 0 ? t('看广告加一个位置', 'Watch an ad to unlock a spot') : t('复制邀请链接', 'Copy invite link');
    if (copy.textContent !== label) copy.textContent = label;
  }
  if (results) {
    results.hidden = joined <= 1;
    results.disabled = !resultsReady();
  }
  const start = document.getElementById('start');
  if (start && screen === 'invite') start.disabled = spots === 0 && !roster.member;
}

async function copyLink(url, feedback) {
  if (!feedback) return;
  try {
    await navigator.clipboard.writeText(url);
    feedback.textContent = t('链接已复制。', 'Link copied.');
    return true;
  } catch {
    feedback.textContent = url;
    return false;
  }
}

function roomInviteUrl() {
  const url = new URL('./', location.href);
  url.searchParams.set('room', room);
  return url.href;
}

function invite() {
  if (roster.joined >= roster.capacity) return openExampleAd();
  const feedback = document.getElementById('invite-status');
  if (debug) {
    feedback.textContent = t('正式答题时，这里会复制邀请链接。', 'In a real round, this copies the invite link.');
    return;
  }
  return copyLink(roomInviteUrl(), feedback);
}

function showToast(text) {
  document.getElementById('room-toast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'room-toast';
  toast.className = 'room-toast';
  toast.setAttribute('role', 'status');
  document.body.append(toast);
  toast.textContent = text;
  window.setTimeout(() => toast.remove(), 3200);
}

function openExampleAd() {
  if (document.getElementById('example-ad')) return;
  const ad = document.createElement('dialog');
  ad.id = 'example-ad';
  ad.setAttribute('aria-labelledby', 'example-ad-title');
  ad.innerHTML = `<div class="example-ad-content">
    <div class="example-ad-actions">
      <div class="example-ad-playback">
        <progress id="example-progress" max="5" value="0"
          aria-label="${t('广告播放进度', 'Ad playback progress')}"></progress>
        <span id="example-seconds" aria-hidden="true">5s</span>
      </div>
      <button type="button" class="button primary" id="exit-example-ad" hidden>${t('完成', 'Done')}</button>
    </div>
    <div class="example-ad-art">
      <span aria-hidden="true">✦</span>
      <p>${t('播完后，这局会多一个位置。', 'Finish watching to unlock one spot in this round.')}</p>
      <h1 id="example-ad-title">${t('测试广告', 'Example ad')}</h1>
    </div>
  </div>`;
  document.body.append(ad);
  const exit = ad.querySelector('#exit-example-ad');
  const progress = ad.querySelector('#example-progress');
  let timer;
  let autoReturn;
  let granting = false;
  let unlocked = false;
  async function returnToRoom() {
    if (!ad.open) return;
    ad.close();
    if (!unlocked) return;
    const copied = !debug && await copyLink(roomInviteUrl(), document.getElementById('invite-status'));
    showToast(copied ? t('增加了一个位置 · 链接已复制', '1 spot unlocked · Link copied')
      : t('已增加一个位置', '1 spot unlocked'));
  }
  ad.addEventListener('close', () => {
    window.clearInterval(timer);
    window.clearTimeout(autoReturn);
    ad.remove();
  });
  exit.addEventListener('click', returnToRoom);
  ad.addEventListener('cancel', event => {
    if (!granting && !unlocked) return;
    event.preventDefault();
    if (unlocked) returnToRoom();
  });
  ad.showModal();
  if (!progress) return;
  const attempt = crypto.randomUUID();
  const start = performance.now();
  timer = window.setInterval(async () => {
    const elapsed = Math.min(5, (performance.now() - start) / 1000);
    progress.value = elapsed;
    ad.querySelector('#example-seconds').textContent = `${Math.ceil(5 - elapsed)}s`;
    if (elapsed < 5) return;
    window.clearInterval(timer);
    granting = true;
    try {
      if (debug) {
        roster.capacity += 1;
        updateRoomPanel();
        unlocked = true;
      } else {
        if (roomRequest) await roomRequest.catch(() => {});
        ({ unlocked } = await unlockExampleSpot(room, token, attempt));
        await refreshRoom();
        if (!unlocked) throw new Error('No spot unlocked');
      }
      exit.hidden = false;
      exit.focus();
      autoReturn = window.setTimeout(returnToRoom, 2000);
    } catch {
      ad.close();
      showToast(t('没能增加名额，再试一次。', 'Couldn’t unlock a spot. Try again.'));
    } finally {
      granting = false;
    }
  }, 100);
}

function valid(question, value) {
  if (question.kind === 'text') return true;
  if (question.kind === 'number') return Number.isSafeInteger(value) && value >= 0;
  if (question.kind === 'assign') return Array.isArray(value) && [0, 1, 2].every(fate => value.includes(fate));
  return value !== null;
}

function dealCard(label, item) {
  return `<button type="button" class="deal-card" data-item="${item}" aria-pressed="false">
    <span aria-hidden="true">${(questions[3].itemIcons ?? ['🌙', '🍴', '✦'])[item]}</span> ${escape(label)}
  </button>`;
}

function bindDeal(question) {
  let selected = null;
  let drag = null;
  let suppressClick = false;
  const board = app.querySelector('.options');
  const hint = document.getElementById('deal-hint');
  function select(item) {
    selected = item === selected ? null : item;
    board.querySelectorAll('[data-item]').forEach(card => {
      card.setAttribute('aria-pressed', String(Number(card.dataset.item) === selected));
    });
    board.classList.toggle('is-dealing', selected !== null);
    hint.textContent = selected === null
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
    }).join('')}</div>`;
  } else if (q.kind === 'number') {
    input = `<input type="number" class="field" id="answer" min="0" step="1" inputmode="numeric" aria-labelledby="title" value="${answer ?? ''}">`;
  } else {
    input = `<input class="field" id="answer" maxlength="100" aria-labelledby="title" placeholder="${t('比如：发圈', 'e.g. Hair ties')}" value="${escape(answer ?? '')}">`;
  }
  const next = q.kind === 'text' && !answer ? t('跳过', 'Skip') : t('继续', 'Continue');
  return `<div class="quizbar"><progress value="${index + 1}" max="8" aria-label="${t('答题进度', 'Quiz progress')}"></progress><span class="steps">${index + 1} / 8</span></div>` +
    frame(`<h1 id="title">${escape(q.prompt[lang])}</h1>
    ${q.kind === 'assign' ? `<p class="status" id="deal-hint" role="status">${t('拖动卡片，或先点卡片，再点要放的位置。', 'Drag a card, or tap it and then tap a spot.')}</p>` : ''}
    <fieldset class="options" aria-labelledby="title" ${q.kind === 'assign' ? 'aria-describedby="deal-hint"' : ''}>${input}</fieldset>
    <div class="actions">${index ? button('back', t('上一题', 'Back')) : ''}${button('next', next, 'primary')}</div>`, cornerSticker(q.icon, quizStickerColors[index]), 'quiz-frame corner-frame') +
    roomPanel() + status;
}

function displayAnswer(q, value) {
  if (q.kind === 'assign') return q.items[lang].map((item, i) => `${item} — ${q.options[lang][value[i]]}`).join(' / ');
  if (q.kind === 'choice') return q.options[lang][value];
  return String(value);
}

let resultStyle = 'badge';
let recapPalette = 'lime';


let sharedRecap = false;
let sharedAnswers = false;
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
    badge: { title: nickname, lines: personalLines(answers, lang, 3, questions === currentQuestions ? 2 : 1), kicker: t('我的答题卡', 'My answer card') },
    guess: { title: guess, lines: questions[0].options[lang], kicker: t('我最爱吃的菜就剩一口了，你问我能不能吃。我会怎么说？', 'You ask for the last bite of my favorite food. What do I say?') }
  };
}

function personal() {
  if (sharedAnswers) return `<section class="room-reveal public-answers">
    <header class="public-answer-heading">${avatarIcon(avatar)}
      <h1>${t(`${escape(nickname)}的答案`, `${escape(nickname)}’s answers`)}</h1>
    </header>
    ${singlePlayerQuestions()}
    <div class="actions"><a class="button primary try-quiz" href="./">${t('我也来答这套题', 'Try the same quiz')}</a></div>
  </section>${status}`;
  const { title, lines, kicker } = resultCards()[resultStyle];
  const position = recapPages.indexOf(resultStyle);
  const recapNav = `<nav class="recap-nav" aria-label="${t('回顾翻页', 'Recap pages')}">
    <button type="button" class="button" id="recap-prev" aria-label="${t('上一张', 'Previous card')}" ${position <= 0 ? 'disabled' : ''}>←</button>
    <span>${position < 0 ? t('总览', 'Summary') : `${position + 1} / ${recapPages.length}`}</span>
    <button type="button" class="button" id="recap-next" aria-label="${t('下一张', 'Next card')}" ${position === recapPages.length - 1 ? 'disabled' : ''}>→</button>
  </nav>`;
  const exportView = resultStyle === 'badge';
  const palette = exportView && !sharedRecap ? `<div class="recap-swatches" role="group" aria-label="${t('卡片配色', 'Card colors')}">
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
    `<p class="sub recap-qr-note">${t('扫码的人可以看到你的全部答案。', 'Anyone who scans the QR can see all your answers.')}</p>` + roomPanel({ recap: true }) + myAnswerList()}${status}`;

}

function singlePlayerQuestions() {
  const player = { nickname, avatar, answers };
  return questions.map((question, index) => groupComparison(question, index, [player], index + 1)).join('');
}

function myAnswerList() {
  return `<section class="solo-answers room-reveal" id="solo-answers" aria-labelledby="solo-answers-title">
    <h2 id="solo-answers-title">${t('我的答案', 'My answers')}</h2>
    ${singlePlayerQuestions()}
  </section>`;
}

// The card is picked from all eight answers now, so the link carries all eight.
// Links in the older five-field shape still open; they show the tab-count card,
// which is all they ever had the data for.
function recapLink() {
  const url = new URL('./recap.html', location.href);
  const kind = sharedRecap && !sharedAnswers ? 'recap' : 'answers';
  url.hash = (questions === currentQuestions ? kind + '-v2=' : kind + '=') + encodeURIComponent(JSON.stringify([lang, nickname, avatar, answers]));
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
  const recapPrefix = /^#(recap|answers)(-v2)?=/.exec(location.hash);
  if (!recapPrefix) return false;
  try {
    const data = JSON.parse(decodeURIComponent(location.hash.slice(recapPrefix[0].length)));
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
    usePackVersion(recapPrefix[2] ? 2 : 1);
    sharedAnswers = full && recapPrefix[1] === 'answers';
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
  const save = document.getElementById('save-recap');
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
      if (save) {
        const retry = t('重试预览', 'Retry preview');
        save.setAttribute('aria-label', retry);
        save.querySelector('span').textContent = retry;
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
  const picked = personalPanels(answers, lang, 3, questions === currentQuestions ? 2 : 1);
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
  write((sharedRecap ? t('扫码看我的答案', 'Scan to view the recap') : t('扫码看我的全部答案', 'Scan to see all my answers')), left, 1061, 29, 800, 560);
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
  ctx.font = `800 30px ${getComputedStyle(document.body).fontFamily}`;
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
  const first = write((sharedRecap ? t('扫码看我的答案', 'Scan to view the recap') : t('扫码看我的全部答案', 'Scan to see all my answers')), 50, lang === 0 ? 1018 : 1058, 33, 800, 590);
  write(packName(), 50, lang === 0 ? 1055 : 1095, 24, 800, 590);
  const last = write(t('八道题，换你来选。', 'Eight questions to play with friends.'), 50, lang === 0 ? 1090 : 1130, 23, 700, 590);
  const qrY = Math.round((first.top + last.bottom - qrSize) / 2);
  ctx.fillStyle = edge;
  ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
}

function saveRecapImage() {
  const canvas = document.getElementById('recap-preview');
  if (canvas.closest('figure').getAttribute('aria-busy') !== 'false' || !canvas.parentElement.querySelector('figcaption').hidden) return;
  const download = document.createElement('a');
  download.href = canvas.toDataURL('image/png');
  download.download = 'little-things-recap.png';
  download.click();
  message(t('图片已生成。', 'Image ready.'));
}

function playerChip(player) {
  return `<span class="player-chip">${avatarIcon(player.avatar)}${escape(player.nickname)}</span>`;
}

function groupComparison(question, index, players, position) {
  const entries = players.map(player => ({ player, value: player.answers[index] }))
    .filter(({ value }) => value !== '' && value != null);
  const single = players.length === 1;
  if (!entries.length && !single) return '';
  const title = `<h2><span class="group-index">${position}</span>${escape(question.title[lang])}</h2><p class="sub">${escape(question.prompt[lang])}</p>`;
  if (!entries.length) {
    return `<section class="group-question">${title}
      <div class="group-replies"><strong>${t('已跳过', 'Skipped')}</strong></div></section>`;
  }
  if (question.kind === 'choice') {
    const buckets = question.options[lang].map((option, i) =>
      ({ option, people: entries.filter(entry => entry.value === i).map(entry => entry.player), i }))
      .filter(({ people }) => people.length);
    return `<section class="group-question">${title}
      ${players.length > 2 ? `<div class="vote-strip" aria-hidden="true">${buckets.map(({ people, i }) =>
        `<span class="side-${i}" style="flex-grow:${people.length}">${people.length}</span>`).join('')}</div>` : ''}
      <div class="vote-legend">${buckets.map(({ option, people, i }) => `<div class="vote-bucket side-${i}">
        <strong>${escape(option)}</strong>${single ? '' : `<div class="player-list">${people.map(playerChip).join('')}</div>`}
      </div>`).join('')}</div>
    </section>`;
  }
  if (single && question.kind === 'assign') {
    const { value } = entries[0];
    return `<section class="group-question">${title}<div class="fate-matrix">
      <div class="fate-grid fate-headings">${question.options[lang].map(recipient =>
        `<strong>${escape(recipient)}</strong>`).join('')}</div>
      <div class="fate-row"><div class="fate-grid">${question.options[lang].map((_, i) =>
        `<div class="side-${i}">${escape(question.items[lang][value.indexOf(i)])}</div>`).join('')}</div></div>
    </div></section>`;
  }
  if (question.kind === 'assign') {
    return `<section class="group-question">${title}<div class="fate-matrix">
      <div class="fate-grid fate-headings">${question.options[lang].map(fate =>
        `<strong>${escape(fate)}</strong>`).join('')}</div>
      ${question.items[lang].map((item, j) => `<div class="fate-row"><h3>${escape(item)}</h3>
        <div class="fate-grid">${question.options[lang].map((fate, i) => {
          const people = entries.filter(entry => entry.value[j] === i).map(entry => entry.player);
          return `<div class="side-${i}" aria-label="${escape(fate)}">${people.length ? people.map(playerChip).join('') : '—'}</div>`;
        }).join('')}</div></div>`).join('')}</div></section>`;
  }
  if (single) {
    return `<section class="group-question">${title}
      <div class="group-replies"><strong>${escape(entries[0].value)}</strong></div></section>`;
  }
  const ordered = question.kind === 'number' ? entries.slice().sort((a, b) => b.value - a.value) : entries;
  const max = question.kind === 'number' ? Math.max(1, ...ordered.map(entry => entry.value)) : 1;
  return `<section class="group-question">${title}<div class="group-replies ${question.kind === 'number' ? 'number-replies' : ''}">${ordered.map(({ player, value }) =>
    `<div class="group-reply">${playerChip(player)}<strong>${escape(value)}</strong>
      ${question.kind === 'number' ? `<div class="number-track" aria-hidden="true"><span style="width:${value / max * 100}%"></span></div>` : ''}</div>`).join('')}</div></section>`;
}

function groupAnswers() {
  const { submissions } = roster;
  const order = [4, 2, 3, 0, 5, 1, 6, 7].filter(i => submissions.some(player => player.answers[i] !== '' && player.answers[i] != null));
  return `<div class="player-list room-players" role="group" aria-label="${t('本局玩家', 'Players in this round')}">${submissions.map(playerChip).join('')}</div>
    ${order.map((i, position) => groupComparison(questions[i], i, submissions, position + 1)).join('')}`;
}

function group() {
  return `<section class="room-reveal">
    ${button('back-to-recap', t('← 我的回顾', '← My recap'), 'recap-back')}
    <h1>${t('这一局，大家怎么选？', 'The room reveal')}</h1>
    <p class="sub" id="group-progress" role="status"></p>
    <div id="group-answers">${groupAnswers()}</div>
    <footer class="group-footer">
      ${roomPanel()}
      ${button('mine', t('看我的回顾', 'See my recap'))}
    </footer></section>${status}`;
}

const packName = () => t('日常小事', 'Everyday Dilemmas');

function packCard({ heading = 'h1', invited = false } = {}) {
  const countTag = `<span class="pack-count">${t(`${questions.length} 道题`, `${questions.length} questions`)}</span>`;
  return frame(`<${heading} class="pack-title">${packName()}</${heading}>
    ${invited ? '<p class="sub invite-spots" id="round-counts" role="status"></p>'
      : `<p class="sub">${t('无聊的小事也有意想不到的答案。', 'A game to get to know each other through questions you’d never think to ask.')}</p>`}
    <div class="actions">${button('start', t('开始答题', 'Start Quiz'), 'primary')}</div>${status}`,
    `<div class="art hero-art"><img src="./everyday-cover.png" alt="">${countTag}</div>`, 'hero');
}


function render() {
  if (debug) document.querySelector('.brand').href = '?debug=1';
  document.documentElement.lang = t('zh-CN', 'en');
  headerShare.hidden = !sharedRecap || resultStyle !== 'guess';
  headerShare.textContent = t('分享', 'Share');
  language.setAttribute('aria-label', t('语言', 'Language'));
  for (const chip of language.children) chip.setAttribute('aria-pressed', String(Number(chip.dataset.language) === lang));
  if (screen === 'home' || screen === 'invite') {
    app.innerHTML = packCard({ invited: screen === 'invite' });
    linkAction('start', start);
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
    app.innerHTML = frame(`<h1>${t('给你的答案署个名', 'Sign your answers')}</h1>
      <form class="options" id="submit"><label class="stack">${t('昵称', 'Nickname')}<input class="field" name="nickname" maxlength="24" required value="${escape(nickname)}"></label>
      ${avatarPicker()}
      <div class="actions">${button('back', t('上一题', 'Back'))}<button class="button primary" type="submit">${t('提交', 'Submit')}</button></div></form>${status}`, cornerSticker('✿', '#fff0b4'), 'corner-frame profile-frame') + roomPanel();
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
        await submitAnswers(room, { nickname, answers, token, avatar });
        savePlayer();
        roster = await readRoom(room, token).catch(() => ({ ...roster, count: Math.max(1, roster.count), submitted: true, submissions: [] }));
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
  else {
    app.innerHTML = `<section class="unavailable">
      <img class="unavailable-art" src="./room-unavailable.png" alt="">
      <h1>${t('哎呀，找不到这局了', 'Whoops!')}</h1>
      <p class="sub">${t('这个邀请链接已经打不开了。', 'This invite link doesn’t open a round anymore.')}</p>
      <a class="button primary" href="./">${t('找个游戏玩', 'Find something to play')}</a>
    </section>
    <section class="suggested-packs" aria-labelledby="suggested-heading">
      <h2 id="suggested-heading">${t('你可能也喜欢', 'You may like')}</h2>
      ${packCard({ heading: 'h3' })}
    </section>`;
    linkAction('start', () => {
      if (busy) return;
      room = null;
      index = 0;
      answers = Array(questions.length).fill(null);
      start();
    });
  }
  app.querySelector('h1')?.setAttribute('tabindex', '-1');
  updateRoomPanel();
  linkAction('copy-invite', invite);
  linkAction('mine', () => show('personal'));
  linkAction('back-to-recap', () => show('personal'));
  linkAction('group', async () => {
    if (debug) return resultsReady() && show('group');
    try {
      await refreshRoom();
      if (resultsReady()) show('group');
    } catch { message(t('没拿到房间结果，再试一次。', 'Couldn’t load the room. Try again.')); }
  });
}

headerShare.addEventListener('click', () => copyLink(location.href, document.getElementById('status')));

language.addEventListener('click', event => {
  const chip = event.target.closest('[data-language]');
  if (!chip || Number(chip.dataset.language) === lang) return;
  lang = Number(chip.dataset.language);
  if (!debug) localStorage.setItem('little-things-language', t('zh', 'en'));
  render();
});

const demoAnswers = [1, 2, 23, [0, 2, 1], 0, 0, 1, '发圈'];

function preview(page) {
  if (page === 'example-ad') {
    preview('crowd');
    document.getElementById('preview-page').value = page;
    openExampleAd();
    return;
  }
  usePackVersion(2);
  answers = structuredClone(demoAnswers);
  nickname = 'Mia';
  avatar = 1;
  resultStyle = 'badge';
  roster = { count: 2, joined: 2, capacity: 5, submissions: [
    { nickname, avatar, answers: structuredClone(answers) },
    { nickname: 'Alex', avatar: 4, answers: [2, 1, 7, [2, 1, 0], 2, 1, 0, 'Keys'] }
  ] };
  if (page.startsWith('q')) {
    roster = { count: 0, joined: 1, capacity: 5, submissions: [] };
    index = Number(page.slice(1));
    answers[index] = null;
    show('quiz');
  } else {
    index = questions.length - 1;
    if (['waiting', 'personal', 'home', 'submit', 'invite'].includes(page)) {
      roster.count = page === 'submit' ? 0 : 1;
      roster.joined = page === 'waiting' ? 3 : 1;
      roster.submissions = [];
    }
    if (page === 'personal-partial' || page === 'group-partial') roster.joined = 3;
    if (page === 'crowd') {
      roster.submissions.push(
        { nickname: 'Jo', avatar: 0, answers: [1, 2, 15, [0, 1, 2], 1, 1, 2, ''] },
        { nickname: 'Sam', avatar: 5, answers: [0, 1, 34, [2, 0, 1], 0, 1, 0, 'Pens'] },
        { nickname: 'Kai', avatar: 2, answers: [2, 2, 0, [1, 2, 0], 2, 0, 2, 'Socks'] }
      );
      roster.joined = roster.count = roster.submissions.length;
    }
    show(['crowd', 'group-partial'].includes(page) ? 'group' : ['waiting', 'personal-ready', 'personal-partial'].includes(page) ? 'personal' : page);
  }
}

function setupPreview() {
  const panel = document.createElement('details');
  panel.className = 'debug-panel';
  panel.open = true;
  const pages = [
    ['home', '首页'], ['invite', '邀请封面'], ...questions.map((q, i) => ['q' + i, `${i + 1}. ${q.title[0]}`]),
    ['submit', '昵称与头像'], ['personal', '个人回顾 · 只有自己'], ['waiting', '个人回顾 · 等待交卷'], ['personal-partial', '个人回顾 · 两人已交卷'], ['personal-ready', '个人回顾 · 全员交卷'], ['group', '双人结果'], ['group-partial', '群体结果 · 有人未交卷'], ['crowd', '五人结果'], ['example-ad', '测试广告'], ['missing', '房间失效']
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
    if (document.getElementById('example-ad') || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
        event.shiftKey || event.target.closest('input, textarea, select, [contenteditable], [role="radio"]')) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    step(event.key === 'ArrowLeft' ? -1 : 1);
  });
  preview('home');
}

let roomRequest;
function refreshRoom() {
  if (roomRequest) return roomRequest;
  roomRequest = readRoom(room, token).then(current => {
    const changed = current.submissions.length !== roster.submissions.length;
    roster = current;
    if (screen === 'group' && changed) document.getElementById('group-answers').innerHTML = groupAnswers();
    updateRoomPanel();
  }).finally(() => { roomRequest = null; });
  return roomRequest;
}

function syncRoom() {
  if (debug || busy || sharedRecap || !room || document.hidden ||
      !['invite', 'quiz', 'submit', 'personal', 'group'].includes(screen)) return;
  refreshRoom().catch(() => {});
}
window.setInterval(syncRoom, 3000);
document.addEventListener('visibilitychange', syncRoom);
window.addEventListener('online', syncRoom);

async function initialize() {
  if (openSharedRecap()) return;
  if (debug) return setupPreview();
  if (!roomParam) return render();
  if (!room) return show('missing');
  loadPlayer();
  try {
    roster = await readRoom(room, token);
    usePackVersion(roster.packVersion);
    if (roster.submitted) return show('personal');
    if (!roster.member) return show('invite');
    const unanswered = questions.findIndex((q, i) => !valid(q, answers[i]));
    index = unanswered < 0 ? questions.length - 1 : unanswered;
    show('quiz');
  } catch { show('missing'); }
}
initialize();
