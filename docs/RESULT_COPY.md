# Result Copy · 结果文案

How a submitted answer becomes a line someone wants to screenshot. Every line here is written by rule, not by a model. See [QUESTION_PACK.md](QUESTION_PACK.md) for the questions and [DECISIONS.md](DECISIONS.md) for why it works this way.

本文件规定「答案 → 句子」的全部规则。个人卡的每一句都由程序按规则生成，不经过模型。

## Answer shape

`answers` is the array stored per submission in `rooms.local.json`, one slot per question:

| i | Question | Value |
|---|---|---|
| 0 | 最后一口 · The last bite | `0` give it away · `1` split · `2` keep it |
| 1 | 认错人了 · Wrong person | `0` hand down · `1` stretch · `2` keep waving |
| 2 | 几个标签页 · How many tabs | non-negative integer |
| 3 | 只能留一个 · Keep one for life | permutation; `answers[3][item] = fate` |
| 4 | 剧透 · Spoilers | `0` don't say · `1` hint first · `2` tell me |
| 5 | 多一个小时 · One extra hour | `0` morning · `1` night |
| 6 | 这段剪掉 · Cut that scene | `0` phone · `1` fridge · `2` singing |
| 7 | 盒子里有啥 · What's in the box | string; `""` means skipped |

Q4 items are `0` waking up without an alarm, `1` favorite dish, `2` laughing with friends. Q4 fates are `0` keep for life, `1` one last time, `2` never again.

## How a card is built

1. Evaluate every trigger below against this player's answers and the room's submitted answers.
2. Each trigger that fires yields one line and a **punch score** 0–100.
3. The personal card shows the **top three** lines by punch score. Ties break by question order.
4. Every question has a `fallback` that always fires at a low score, so a player whose answers are all unremarkable still gets a full card.

Scores are tuned so that a room-relative finding (only you / highest / unanimous) outranks a plain restatement, and a cross-question combination outranks both.

**Rooms of one.** Triggers marked *room* need at least two submissions. Before a second player submits, only *solo-safe* triggers fire. There are enough of those for every question to produce a card on its own.

## Hard rules for every line

- **Restate, never characterize.** The line may repeat what someone answered and may count what the room answered. It may not describe the person. "You kept the last bite" is a line. "You're possessive about food" is not.
- **No invented facts.** Only values present in `answers`.
- **Numbers come from the room.** `{n}`, `{avg}`, `{total}` are computed from submitted answers only; skipped answers are excluded.
- **Keep the scenario.** Q4, Q5 and Q7 are hypothetical. Lines keep enough of the setup that the answer still makes sense out of context.
- **The follow-up test.** Every line should invite a question its subject would enjoy answering. If the obvious follow-up makes someone want to change the subject, the line is wrong.

---

## Q1 · 最后一口 · The last bite

| Trigger | Condition | 中文 | English | Punch |
|---|---|---|---|---|
| solo *room* | only player with `0]==2` | 这桌只有你把最后一口留给了自己。 | You're the only one at this table keeping the last bite. | 88 |
| unanimous *room* | all `==2` | 没有人愿意交出最后一口。一个都没有。 | Nobody here gives up the last bite. Not one person. | 82 |
| generous | `==0` | 最后一口你整口让了出去，什么条件都没提。 | You handed over the whole last bite. No conditions. | 52 |
| split | `==1` | 最后一口你愿意分，但得真的切成两半。 | You'll share the last bite — properly cut in half. | 46 |
| fallback | always | 最后一口，{total} 个人里有 {n} 个和你选得一样。 | On the last bite, {n} of {total} answered the way you did. | 20 |

## Q2 · 认错人了 · Wrong person

| Trigger | Condition | 中文 | English | Punch |
|---|---|---|---|---|
| solo *room* | only player with `==2` | 只有你把剩下那半个招呼打完了。 | You're the only one who finished the wave. | 88 |
| committed | `==2` | 挥错了也要挥完，顺便跟陌生人打了个招呼。 | Wrong person, finished the wave anyway. Said hi to a stranger. | 60 |
| cover | `==1` | 那半个招呼，你把它变成了一个伸懒腰。 | You turned half a wave into a stretch. | 56 |
| abort | `==0` | 一发现认错人，你的手立刻就下来了。 | The moment you realized, your hand went straight down. | 46 |
| fallback | always | 认错人的时候，{n} 个人和你的反应一样。 | {n} people react to the wrong person exactly like you. | 20 |

## Q3 · 几个标签页 · How many tabs

The widest range in the pack, so it carries the highest ceiling. Estimates are expected; the magnitude is the joke, not the precision.

| Trigger | Condition | 中文 | English | Punch |
|---|---|---|---|---|
| hundreds | `>= 100` | 你手机上开着 {n} 个标签页。{n} 个。 | You have {n} tabs open. {n}. | 95 |
| champion *room* | `== max` and `>= 20` | 这个房间的标签页冠军是你，{n} 个。 | Tab champion of this room: {n}. | 90 |
| empty | `== 0` | 你的浏览器是空的，干净得像刚开封。 | Your browser is empty. Factory fresh. | 88 |
| nearly empty | `<= 2` | 只开 {n} 个标签页的人是真实存在的，你就是。 | People who keep {n} open really exist. You're one. | 70 |
| fewest *room* | `== min` and `max - min >= 20` | 房间里开得最少的是你，{n} 个。 | Fewest in the room: you, at {n}. | 64 |
| fallback | always | {n} 个标签页。房间平均 {avg} 个。 | {n} tabs. Room average {avg}. | 20 |

## Q4 · 只能留一个 · Keep one for life

The only assignment question, and the only one whose fallback is a full sentence — the permutation itself is the content, so this line never misfires.

| Trigger | Condition | 中文 | English | Punch |
|---|---|---|---|---|
| cut the laughing | item `2` → fate `2` | 你亲手划掉了跟朋友笑到肚子疼。 | You crossed out laughing with friends until it hurts. | 90 |
| solo *room* | an (item, fate) pair no one else chose | 只有你把「{item}」放进了「{fate}」。 | You're the only one who put "{item}" in "{fate}". | 85 |
| structural | always | {keep} 我要留一辈子，{last} 再来最后一次，代价是再也没有 {never}。 | {keep} for life, {last} one last time, and never {never} again. | 70 |

## Q5 · 剧透 · Spoilers

| Trigger | Condition | 中文 | English | Punch |
|---|---|---|---|---|
| solo *room* | only player with `==2` | 这个房间只有你主动要听结局。 | You're the only person here who asked for the ending. | 88 |
| spoil me | `==2` | 结局你现在就要知道，一个字都不想等。 | You want the ending now. Not waiting. | 60 |
| negotiate | `==1` | 你要先拿一点提示，再决定要不要听下去。 | You want a hint first, then you'll decide. | 50 |
| sealed | `==0` | 一个字都别说。 | Not one word. | 52 |
| fallback | always | 关于剧透，{n} 个人和你站在一边。 | On spoilers, {n} people are on your side. | 20 |

## Q6 · 多一个小时 · One extra hour

Two options, so `solo` is rare and worth a lot when it fires.

| Trigger | Condition | 中文 | English | Punch |
|---|---|---|---|---|
| solo *room* | only player with this value, `total >= 3` | {total} 个人里，只有你把那一小时放在了{slot}。 | Of {total} people, only you put that hour in the {slot}. | 92 |
| dead even *room* | exact 50/50, `total >= 4` | 这道题房间正好劈成两半。 | This one splits the room exactly down the middle. | 76 |
| morning | `==0` | 白送的一小时，你加在了早上。 | The free hour goes to your morning. | 46 |
| night | `==1` | 白送的一小时，你留到了晚上。 | The free hour goes to your night. | 46 |
| fallback | always | 多出来的那一小时，{n} 个人和你花在同一头。 | {n} people spend that extra hour the same end of the day. | 20 |

## Q7 · 这段剪掉 · Cut that scene

| Trigger | Condition | 中文 | English | Punch |
|---|---|---|---|---|
| unanimous *room* | all same | 全场要剪的是同一段。 | Everyone here cuts the same scene. | 80 |
| solo *room* | only player with this value | 只有你要剪掉那一段。 | You're the only one cutting that scene. | 85 |
| singing | `==2` | 你最不想被拍到的，是戴着耳机唱歌，还以为自己声音很小。 | The scene you'd cut: singing with headphones on, sure you were being quiet. | 66 |
| phone | `==0` | 你最不想被拍到的，是一边找手机一边拿着手机。 | The scene you'd cut: looking for the phone that's in your hand. | 62 |
| fridge | `==1` | 你最不想被拍到的，是两分钟里开了两次冰箱。 | The scene you'd cut: opening the fridge twice in two minutes. | 62 |
| fallback | always | 这一段，{n} 个人也想剪掉。 | {n} other people would cut that same scene. | 20 |

## Q8 · 盒子里有啥 · What's in the box

Free text, skippable. The template never reads the answer — it only frames it — so any word works.

| Trigger | Condition | 中文 | English | Punch |
|---|---|---|---|---|
| match *room* | another player wrote the same thing (trim, casefold) | 你和 {name} 在找同一样东西：{answer}。 | You and {name} keep losing the same thing: {answer}. | 90 |
| answered | non-empty | 要是有人把你这一年弄丢的东西收起来，你猜能收到一盒{answer}。 | If someone boxed up what you lost this year, you'd get a box of {answer}. | 70 |
| skipped | `""` | — produces no line; excluded from the card and from comparisons — | | — |

---

## Cross-question combinations

Highest scores in the system. A combination outranks any single answer because it is the one thing a reader could not have worked out by looking at one question.

| Condition | 中文 | English | Punch |
|---|---|---|---|
| `2] >= 100` and `3][0] == 0` | 你开着 {n} 个标签页，但最想保住的是睡到自然醒。 | You have {n} tabs open, and the thing you'd keep for life is waking up without an alarm. | 94 |
| `0] == 2` and `3][1] == 0` | 最后一口你留给自己，最爱吃的菜你要留一辈子。 | You keep the last bite, and you keep your favorite dish for life. | 92 |
| `1] == 0` and `6] == 2` | 认错人你立刻收手，但戴着耳机唱歌时你以为没人听得见。 | You drop your hand instantly, yet you sing in headphones sure nobody can hear. | 90 |
| `4] == 0` and `7]` non-empty | 剧透你一个字都不听，但盒子里装什么你一猜就猜了。 | You won't hear one word of a spoiler, but you guessed what's in the box right away. | 86 |
| majority on `>= 6` questions *room* | 八道题里，有 {n} 道你和大多数人选得一样。 | On {n} of eight questions you answered with the majority. | 72 |
| minority on `>= 4` questions *room* | 八道题里，你有 {n} 道站在少数那边。 | On {n} of eight questions you were in the minority. | 86 |

The last two exist so that a player with no extreme answers still gets a finding. Answering down the middle every time is itself a result.

---

## Group page

**Computed, always shown.** Per-question distribution; who chose what; unanimous and evenly-split questions; tab high, low and average; repeated answers in Q8. None of this needs a model and none of it can fail.

**Model-written, at most two lines.** One connection across questions that the table does not already show. It runs after the computed section renders, and the page is complete without it.

Constraints for that call:

- Use only answers submitted in this room. Quote them as given.
- No adjective describing a person, and no claim about what someone is like. Restate answers, then ask something.
- End on a question **a third person would want to ask** — write it so a reader turns to the player, not so the player answers about themselves. "Has {name} ever found a way to keep track of keys?" rather than "{name}, have you ever...".
- Name at most two players per line.
- Fewer than two submissions, or any failure: output nothing. The computed section stands alone.

Worked example, from the two submissions currently in `rooms.local.json`:

> Alex keeps the last bite and still finishes a wave at the wrong person. The box of things Alex lost this year? Hair ties. Has anyone seen Alex actually lose anything else?

