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

For legacy rounds, Q4 items are `0` waking up without an alarm, `1` favorite dish, `2` laughing with friends. Q4 fates are `0` keep for life, `1` one last time, `2` never again.

For new rounds, Q4 uses superpowers (fall asleep instantly, land the punchline, order the best dish) and recipients (self, friend, nemesis). Q7 uses three distinct habits (repeat a song, peek at nearby tables, greet a dog). The recap uses copy for the round's pack version.

## How a card is built

1. Evaluate every trigger against **this player's answers and nothing else**.
2. Each trigger that fires yields one line and a **punch score** 0–100.
3. The card shows the **top three** by punch score. Ties break by question order.
4. Several triggers always fire, so a player whose answers are all unremarkable still gets a full card of three.

**The card never reads the room.** It is what a player shares to pull friends in,
so it has to be worth sharing while they are still the only person who has
played — waiting for a room to fill would mean the invitation only becomes good
after it has already worked. It also must not change after it has been shared.

This is a change from the first draft, which scored room-relative findings
(only you / highest / unanimous) above everything else. Those findings are real
and still worth showing, but they belong on the group page, which is the screen
about the room. The personal card is the screen about one person.

Scores are therefore tuned so a cross-question combination outranks an extreme
single answer, which outranks a distinctive choice, which outranks a plain
restatement.

## Hard rules for every line

- **Restate, never characterize.** The line may repeat what someone answered and may count what the room answered. It may not describe the person. "You kept the last bite" is a line. "You're possessive about food" is not.
- **No invented facts.** Only values present in `answers`.
- **Numbers come from the room.** `{n}`, `{avg}`, `{total}` are computed from submitted answers only; skipped answers are excluded.
- **Keep the scenario.** Q4, Q5 and Q7 are hypothetical. Lines keep enough of the setup that the answer still makes sense out of context.
- **The follow-up test.** Every line should invite a question its subject would enjoy answering. If the obvious follow-up makes someone want to change the subject, the line is wrong.

---

## The table itself lives in code

`triggers.js` holds all 27 triggers, their conditions, both languages and both
forms. It is the only copy; keeping a second one here in prose would drift the
first time a score moved. What stays in this file is everything the code cannot
say about itself: why the rules are shaped this way.

Each trigger carries the same finding twice:

- `line` — one full sentence, for the HTML card and the shared recap.
- `panel` — a short prompt and a short answer, for the share image, which draws
  big non-wrapping text in fixed panels. An answer longer than roughly twelve
  Chinese characters or twenty-five English ones will be shrunk to fit and start
  to look cramped.

Rough score bands, so a new trigger lands in the right place:

| Band | What earns it | Example |
|---|---|---|
| 86–95 | A cross-question combination, or a genuinely extreme single answer | 312 tabs; tabs plus wanting to sleep in |
| 60–70 | A distinctive choice on a three-option question | finishing the wave at a stranger |
| 44–58 | A plain restatement that always has something to say | which hour, which scene |
| 38 | A number in the unremarkable middle | 23 tabs |

Two mechanics keep a card from repeating itself:

- **One line per group.** Each question is a group; only its highest-scoring
  trigger reaches the card, so one question never takes two of the three slots.
- **A combination covers what it mentions.** When the tabs-and-alarm combination
  fires, the tabs question and the keep-one question are dropped, because the
  combination has already said both.

Checked across all 15,552 answer combinations in both languages: every card gets
three lines, no card repeats a line, and no share image overflows its panels.
The original pack produces 376 distinct Chinese cards; the current one, 117.

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

