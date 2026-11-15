import { questions } from './questions.js';

// Which three things a personal card says, and how it says them.
//
// Every line is written here, by rule. No model runs on this path: the card has
// to be ready the moment a player finishes, and a rule cannot invent a fact or
// stall. docs/RESULT_COPY.md is the prose version of this file.
//
// The card is built from ONE player's answers and nothing else. It is what a
// player shares to pull friends in, so it cannot wait for a room to fill up, and
// it must not change after it has been shared. Comparisons across a room are
// real and worth showing, but they belong on the group page.
//
// Two hard rules, from docs/DECISIONS.md:
//   - Restate, never characterize. "I kept the last bite" is a line.
//     "I'm possessive about food" is not — that is personality typing, which the
//     product deliberately excludes.
//   - No invented facts. Only what is in `answers`.
//
// Each trigger carries two forms of the same finding:
//   line  — one full sentence, for the HTML card and the shared recap.
//   panel — a short prompt and a short answer, for the share image, which draws
//           big text that does not wrap inside fixed panels. Keep the answer
//           under about twelve Chinese characters or twenty-five English ones.

const ITEMS = [
  ['睡到自然醒', 'Waking up without an alarm'],
  ['吃最爱吃的菜', 'Eating my favorite dish'],
  ['跟朋友笑到肚子疼', 'Laughing with friends until it hurts']
];

// answers[3][item] = fate, where fate 0 keeps it for life, 1 is one last time,
// 2 is never again. So the item kept for life is the index holding fate 0.
const itemWithFate = (assignment, fate) => ITEMS[assignment.indexOf(fate)];
const misplaced = answers => String(answers[7] ?? '').trim();
const tabs = n => `${n} tab${n === 1 ? '' : 's'}`;

const TABS_Q = ['我手机上开了多少个网页？', 'How many tabs are open in my phone browser?'];
const BITE_Q = ['最后一口，我给不给？', 'The last bite — do I share it?'];
const WAVE_Q = ['挥错人了，我怎么办？', 'Wrong person — now what?'];
const SPOIL_Q = ['朋友要剧透，我怎么回？', 'A friend offers to spoil the movie. What do I say?'];
const HOUR_Q = ['白送我一小时，我拿来干嘛？', 'How would I spend an extra hour every day?'];
const CUT_Q = ['我最不想被拍到哪一段？', "The scene I'd cut from the footage?"];

// Only the highest-scoring trigger in a group reaches the card, so one question
// never takes two of the three slots. A combination also `covers` the questions
// it already mentions, so the card never says the same thing twice.
const TRIGGERS = [
  // ---- Combinations. The highest scores in the system, because a combination
  // is the one thing a reader could not have worked out from a single answer.
  { group: 'c1', punch: 94, covers: [2, 3],
    when: a => a[2] >= 100 && a[3][0] === 0,
    line: a => [`我开着 ${a[2]} 个标签页，但最想保住的是睡到自然醒。`,
                `I have ${a[2]} tabs open, and the thing I'd keep for life is waking up without an alarm.`],
    panel: a => [[`开着 ${a[2]} 个标签页的人，最想保住什么？`, `With ${a[2]} tabs open, what would I keep?`],
                 ['睡到自然醒', 'Waking up without an alarm']] },

  { group: 'c2', punch: 92, covers: [0, 3],
    when: a => a[0] === 2 && a[3][1] === 0,
    line: () => ['最后一口我留给自己，最爱吃的菜我要留一辈子。',
                 'I keep the last bite, and my favorite dish is the thing I keep for life.'],
    panel: () => [['最后一口我自己吃。那要留一辈子的呢？', 'I keep the last bite. So what do I keep for life?'],
                  ['最爱吃的菜', 'My favorite dish']] },

  { group: 'c3', punch: 90, covers: [1, 6],
    when: a => a[1] === 0 && a[6] === 2,
    line: () => ['认错人我立刻收手，但戴着耳机唱歌的时候，我以为没人听得见。',
                 'My hand drops the instant I realize, yet in headphones I sing like nobody can hear me.'],
    panel: () => [['认错人我秒收手。那没人看着的时候呢？', 'My hand drops instantly. So what do I do alone?'],
                  ['戴着耳机唱歌', 'Sing in headphones']] },

  { group: 'c4', punch: 86, covers: [4, 7],
    when: a => a[4] === 0 && misplaced(a) !== '',
    line: a => [`剧透我一个字都不想听，但我老是在找${misplaced(a)}。`,
                `No spoilers, please. I’m already busy looking for my ${misplaced(a)}.`],
    panel: a => [['不听剧透。那我老是在找什么？', "No spoilers. What am I always looking for?"],
                 [misplaced(a), misplaced(a)]] },

  // ---- Q3 · tabs. The widest range in the pack, so it carries the highest
  // ceiling of any single question. The magnitude is the joke, not the precision.
  { group: 'q2', punch: 95, when: a => a[2] >= 100,
    line: a => [`我手机上开着 ${a[2]} 个标签页。${a[2]} 个。`, `I have ${a[2]} tabs open. ${a[2]}.`],
    panel: a => [TABS_Q, [`${a[2]} 个`, String(a[2])]] },
  { group: 'q2', punch: 88, when: a => a[2] === 0,
    line: () => ['我的浏览器是空的，干净得像刚开封。', 'My browser is empty. Factory fresh.'],
    panel: () => [TABS_Q, ['一个都没有', 'None. Zero.']] },
  { group: 'q2', punch: 70, when: a => a[2] <= 2,
    line: a => [`只开 ${a[2]} 个标签页的人是真实存在的，我就是。`, `People who keep ${tabs(a[2])} open really exist. I'm one.`],
    panel: a => [TABS_Q, [`就 ${a[2]} 个`, `Just ${a[2]}`]] },
  { group: 'q2', punch: 48, when: a => a[2] >= 20,
    line: a => [`${a[2]} 个标签页，我一个都没关。`, `${a[2]} tabs, and I haven't closed one.`],
    panel: a => [TABS_Q, [`${a[2]} 个，一个没关`, `${a[2]}, none closed`]] },
  { group: 'q2', punch: 38, when: () => true,
    line: a => [`${a[2]} 个标签页，就这么开着。`, `${a[2]} tabs, just sitting there.`],
    panel: a => [TABS_Q, [`${a[2]} 个`, String(a[2])]] },

  // ---- Q4 · keep one for life. The permutation itself is the content, so the
  // structural line never misfires and this question always has something.
  { group: 'q3', punch: 90, when: a => a[3][2] === 2,
    line: () => ['我亲手划掉了跟朋友笑到肚子疼。', 'I crossed out laughing with friends until it hurts.'],
    panel: () => [['我亲手划掉了哪一个？', 'Which one did I cross out?'],
                  ['跟朋友笑到肚子疼', 'Laughing with friends']] },
  { group: 'q3', punch: 58, when: () => true,
    line: a => [`${itemWithFate(a[3], 0)[0]}——留一辈子。${itemWithFate(a[3], 1)[0]}——再来最后一次。${itemWithFate(a[3], 2)[0]}——以后再也没有。`,
                `${itemWithFate(a[3], 0)[1]} — for life. ${itemWithFate(a[3], 1)[1]} — one last time. ${itemWithFate(a[3], 2)[1]} — never again.`],
    panel: a => [['我要留一辈子的是？', 'The one thing I keep for life?'], itemWithFate(a[3], 0)] },

  // ---- Q7 · cut that scene
  { group: 'q6', punch: 66, when: a => a[6] === 2,
    line: () => ['我最不想被拍到的，是戴着耳机唱歌，还以为自己声音很小。', "The scene I'd cut: singing with headphones on, sure I was being quiet."],
    panel: () => [CUT_Q, ['戴着耳机唱歌', 'Singing in headphones']] },
  { group: 'q6', punch: 62, when: a => a[6] === 0,
    line: () => ['我最不想被拍到的，是一边找手机一边拿着手机。', "The scene I'd cut: looking for the phone that's in my hand."],
    panel: () => [CUT_Q, ['找手上那个手机', 'Looking for the phone in my hand']] },
  { group: 'q6', punch: 62, when: a => a[6] === 1,
    line: () => ['我最不想被拍到的，是两分钟里开了两次冰箱。', "The scene I'd cut: opening the fridge twice in two minutes."],
    panel: () => [CUT_Q, ['两分钟开两次冰箱', 'Opening the fridge twice']] },

  // ---- Q8 · misplaced items. Skipping it produces no line, by design.
  { group: 'q7', punch: 62, when: a => misplaced(a) !== '',
    line: a => [`我老是找不到${misplaced(a)}。`,
                `I’m always looking for my ${misplaced(a)}.`],
    panel: a => [['我老是在找什么？', 'What am I always looking for?'], [misplaced(a), misplaced(a)]] },

  // ---- Q2 · wrong person
  { group: 'q1', punch: 60, when: a => a[1] === 2,
    line: () => ['挥错了也要挥完，顺便跟陌生人打了个招呼。', 'Wrong person, finished the wave anyway. Said hi to a stranger.'],
    panel: () => [WAVE_Q, ['接着挥完', 'Keep waving.']] },
  { group: 'q1', punch: 56, when: a => a[1] === 1,
    line: () => ['那半个招呼，我把它变成了一个伸懒腰。', 'I turned half a wave into a stretch.'],
    panel: () => [WAVE_Q, ['假装在伸懒腰', "Pretend I'm stretching."]] },
  { group: 'q1', punch: 46, when: a => a[1] === 0,
    line: () => ['一发现认错人，我的手立刻就下来了。', 'The moment I realized, my hand went straight down.'],
    panel: () => [WAVE_Q, ['手立刻放下', 'Hand straight down.']] },

  // ---- Q5 · spoilers
  { group: 'q4', punch: 60, when: a => a[4] === 2,
    line: () => ['结局我现在就要知道，一个字都不想等。', 'I want the ending now. Not waiting.'],
    panel: () => [SPOIL_Q, ['快说，我爱听', 'Tell me everything.']] },
  { group: 'q4', punch: 52, when: a => a[4] === 0,
    line: () => ['一个字都别说。', 'Not one word.'],
    panel: () => [SPOIL_Q, ['一个字都别说', "Don't say a word."]] },
  { group: 'q4', punch: 50, when: a => a[4] === 1,
    line: () => ['我要先拿一点提示，再决定要不要听下去。', "I want a hint first, then I'll decide."],
    panel: () => [SPOIL_Q, ['先给点提示', 'Give me a hint first.']] },

  // ---- Q1 · the last bite
  { group: 'q0', punch: 54, when: a => a[0] === 2,
    line: () => ['最后一口我没让出去。它是我的。', "The last bite didn't go anywhere. It's mine."],
    panel: () => [BITE_Q, ['这口我自己吃', "It's mine."]] },
  { group: 'q0', punch: 52, when: a => a[0] === 0,
    line: () => ['最后一口我整口让了出去，什么条件都没提。', 'I handed over the whole last bite. No conditions.'],
    panel: () => [BITE_Q, ['吃吧，都给你', 'All yours.']] },
  { group: 'q0', punch: 46, when: a => a[0] === 1,
    line: () => ['最后一口我愿意分，但得真的切成两半。', "I'll share the last bite — properly cut in half."],
    panel: () => [BITE_Q, ['一人一半', 'We split it.']] },

  // ---- Q6 · one extra hour. Two options, so there is little to say about it on
  // its own; it scores low and reaches a card only when nothing else fires.
  { group: 'q5', punch: 44, when: a => a[5] === 0,
    line: () => ['白送的一小时，我加在了早上。', 'The free hour goes to my morning.'],
    panel: () => [HOUR_Q, ['早上多睡一小时', "I'd sleep in."]] },
  { group: 'q5', punch: 44, when: a => a[5] === 1,
    line: () => ['白送的一小时，我留到了晚上。', 'The free hour goes to my night.'],
    panel: () => [HOUR_Q, ['晚上多玩一小时', "I'd save it for nighttime."]] }
];

// The revised choices have different meanings, so older recaps use their
// original triggers even though the answer indexes have the same shape.
const UPDATED_TRIGGERS = [
  ...TRIGGERS.filter(({ group }) => !['c1', 'c2', 'c3', 'q3', 'q6'].includes(group)),
  {
    group: 'q3',
    punch: 75,
    when: a => Array.isArray(a[3]) && a[3].includes(2),
    line: a => [
      `我送给仇人的超能力是：${questions[3].items[0][a[3].indexOf(2)]}。`,
      `The superpower I gave my nemesis: ${questions[3].items[1][a[3].indexOf(2)]}.`
    ],
    panel: a => [
      ['我给仇人送了什么超能力？', 'Which power would I give my nemesis?'],
      [['躺下秒睡', 'Fall asleep instantly'], ['讲笑话从不冷场', 'Always get a laugh'], ['点菜从不踩雷', 'Always order the best dish']][a[3].indexOf(2)]
    ]
  },
  {
    group: 'q6',
    punch: 64,
    when: a => [0, 1, 2].includes(a[6]),
    line: a => [
      `这事儿很像我：${questions[6].options[0][a[6]]}`,
      `Very me: ${questions[6].options[1][a[6]]}`
    ],
    panel: a => [
      ['下面哪件事最像我？', 'What sounds most like me?'],
      [['喜欢的歌单曲循环', 'I play songs on repeat'], ['点菜先看隔壁桌', 'I peek before I order'], ['见到小狗就打招呼', 'I say hi to cute dogs']][a[6]]
    ]
  }
];

/** The triggers that fire for one player, best first, one per group. */
function chosen(answers, limit, version) {
  if (!Array.isArray(answers)) return [];
  const best = new Map();
  for (const trigger of version === 2 ? UPDATED_TRIGGERS : TRIGGERS) {
    let hit = false;
    try { hit = trigger.when(answers); } catch { hit = false; }
    if (!hit) continue;
    const held = best.get(trigger.group);
    if (!held || trigger.punch > held.punch) best.set(trigger.group, trigger);
  }
  // A combination already says what its questions would have said alone.
  for (const trigger of [...best.values()]) {
    if (trigger.covers) trigger.covers.forEach(q => best.delete('q' + q));
  }
  return [...best.values()].sort((a, b) => b.punch - a.punch).slice(0, limit);
}

/** One sentence per finding, for the HTML card. `lang` is 0 Chinese, 1 English. */
export function personalLines(answers, lang = 0, limit = 3, version = 1) {
  const lines = [];
  for (const trigger of chosen(answers, limit, version)) {
    // A half-filled answer set should cost one line, never the whole card.
    try { lines.push(trigger.line(answers, lang)[lang]); } catch { /* skip */ }
  }
  return lines;
}

/** Prompt and answer per finding, for the share image. */
export function personalPanels(answers, lang = 0, limit = 3, version = 1) {
  const panels = [];
  for (const trigger of chosen(answers, limit, version)) {
    try {
      const [prompt, reply] = trigger.panel(answers, lang);
      panels.push({ prompt: prompt[lang], reply: reply[lang] });
    } catch { /* skip */ }
  }
  return panels;
}
