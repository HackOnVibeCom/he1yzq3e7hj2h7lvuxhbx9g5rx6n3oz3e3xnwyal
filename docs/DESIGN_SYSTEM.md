# Little Things — Design System

**Product:** Little Things is a game-like "What Would You Pick?" app. Friends answer eight questions, then guess each other's answers. This system covers its sharing and results surfaces: the **recap card**, the **link preview** (1200×630) and the **room reveal** results page.

**One-line style:** *Pop-comic / neo-brutalist stickers on a pastel ground.* Thick ink outlines, hard offset shadows, halftone dots, zigzag paper edges, slightly tilted stickers, one chunky rounded grotesque (Bricolage Grotesque for English and Smiley Sans for Chinese). Friendly and loud, never dark or corporate.

> **Using this with another tool / prototype:** copy everything from "Quick rules" down to "Screens" into the prompt. Everything is plain CSS values; no build step is needed.

---

## Quick rules (the 12 that matter)

1. **Font:** Bricolage Grotesque for English and the Little Things wordmark in both locales. Smiley Sans for Simplified Chinese, with PingFang SC as the fallback. Headlines 800 with letter-spacing −0.02 to −0.035em and line-height 0.92–1.02.
2. **Ground color is a theme.** Every card is one colorway: `bg` (pastel) + `ink` (dark shade of the same hue) + `accent` (one step deeper than bg) + `paper` (#fffdf8 warm white). Default colorway: **lime**.
3. **Ink is not black.** All text, outlines and shadows use `ink`, a dark tint of the colorway hue. Title text is one ink color; no colored or offset title shadows.
4. **Everything has a thick outline:** 3px `ink` on cards and stickers (4px on link-preview chips, 6px on the 1200×630 card, 2.5px on small pills and tiles).
5. **Shadows are hard, never blurred:** `Npx Npx 0 ink` (3 / 5 / 7px). Cards drop straight down: `0 7px 0 ink` (10px on the link preview).
6. **Corners:** stickers 6px, option cards 16px, panels 22px, recap card 30px, link-preview card 44px, pills 999px.
7. **Halftone dots** (`radial-gradient` grid, masked to fade) live in corners and empty gaps only, never behind text.
8. **Tilt stickers a little:** −1.2°, +1°, −0.7°. Never beyond ±2.5° (avatar frame up to 5°).
9. **Light headers only.** Page / card headers are `bg`, `paper` or `accent` with an optional zigzag bottom edge. Never a dark or ink header band.
10. **Whole card is the tap target.** The call to action is a small ink corner tab ("Take a guess →"), not a big button.
11. **Question art** uses the question’s emoji in a paper sticker. Player portraits use the 20 supplied sticker images.
12. **One question = one sticker.** Small label (13–14px/700) above a big answer (38–42px/800), max two lines.

---

## Colorways

Pick one per card; do not mix colorways within a card. Fixed fills (`fill-pink`, `fill-peach`, `fill-blue`) are shared by all colorways and give option cards / matrix columns their colors in order: **bg → pink → peach**.

| id | bg | ink | accent |
|---|---|---|---|
| **lime (default)** | #dff06c | #1c2a14 | #b5d233 |
| orange | #f8c07e | #3b2108 | #e8962f |
| yellow | #fce587 | #3a3008 | #e8c42a |
| red | #f08a80 | #3a1410 | #d9564a |
| green | #9fe0b4 | #0f3322 | #52b97a |
| teal | #8fdbe0 | #0b3338 | #3bb0ba |
| blue | #a8c0f8 | #14214f | #6b8fe8 |
| purple | #c4aef2 | #2a1559 | #9573dc |
| pink | #f8c4d2 | #4a1428 | #ec8fa8 |

Fixed: `paper #fffdf8` · `track #efe9da` (empty bar) · `mat #f3eee6` (neutral mat around a card) · `fill-pink #f8c4d2` · `fill-peach #f8c07e` · `fill-blue #a8c0f8`.

```css
:root{            /* lime */
  --bg:#dff06c; --ink:#1c2a14; --accent:#b5d233; --dot:var(--ink);
  --paper:#fffdf8; --track:#efe9da; --mat:#f3eee6;
  --fill-pink:#f8c4d2; --fill-peach:#f8c07e; --fill-blue:#a8c0f8;
}
```
Switch colorways by overriding only `--bg --ink --accent` (and optionally `--dot`).

---

## Typography

English and brand family: `"Bricolage Grotesque", system-ui, sans-serif`, `<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&display=swap" rel="stylesheet">`

| style | size / line | weight | tracking | use |
|---|---|---|---|---|
| display-xl | 88 / 0.98 | 800 | −0.03em | question on 1200×630 preview (max 2 lines, max-width ≈ 760) |
| display-lg | 54 / 0.92 | 800 | −0.035em | results page title |
| display-md | 46 / 0.95 | 800 | −0.03em | compact page title; recap title 36–40 |
| answer | 38–42 / 1.02 | 800 | −0.02em | answer inside a sticker |
| heading | 28 / 1 | 800 | −0.02em | section heading beside a number badge |
| option | 17–19 / 1.15 | 800 | −0.01em | option / row text |
| prompt | 15–16 / 1.35 | 600 | 0 | explanatory paragraph |
| label | 13–14 / 1.22 | 700 | 0 | question label above an answer |
| micro | 11–12 / 1.1 | 800 | 0 | names under avatars, matrix column headers |

Link-preview chips use 32–34px/800. Numbers in stats/leaderboards: 26–40px/800.

---

## Shape language (copy-paste recipes)

**Card (recap, 520×660 inside a 560×700 `mat`):**
```css
.card{background:var(--bg);color:var(--ink);border:3px solid var(--ink);border-radius:30px;box-shadow:0 7px 0 var(--ink);overflow:hidden;position:relative}
```
**Sticker (question + answer):**
```css
.sticker{background:var(--paper);border:3px solid var(--ink);border-radius:6px;box-shadow:6px 6px 0 var(--ink);padding:14px 18px 16px}
/* tilt: rotate(-1.2deg) / rotate(1deg) / rotate(-.7deg); widths 92% / 86% (right aligned) / 80% */
```
**Halftone (corner texture, fades out):**
```css
.halftone{background-image:radial-gradient(var(--dot) 2.4px,transparent 3px);background-size:14px 14px;
 -webkit-mask-image:linear-gradient(to bottom left,#000,transparent 88%);mask-image:linear-gradient(to bottom left,#000,transparent 88%)}
/* 1200×630: 24–26px grid, 4px dots, box ≈ 360×380 top-right, mask direction "to bottom left" */
```
**Option chip (A / B / C):**
```css
.chip{display:flex;align-items:center;gap:12px;background:var(--paper);border:4px solid var(--ink);box-shadow:6px 6px 0 var(--ink);padding:12px 24px 12px 14px;font:800 32px "Bricolage Grotesque"}
.chip i{width:40px;height:40px;border-radius:50%;background:var(--accent);border:3px solid var(--ink);display:grid;place-items:center;font:800 22px "Bricolage Grotesque";font-style:normal}
```
**Corner tab (CTA, a hint, not a button):**
```css
.tab{position:absolute;right:0;bottom:0;display:flex;gap:12px;align-items:center;background:var(--ink);color:var(--bg);padding:14px 32px 16px 36px;font:800 28px "Bricolage Grotesque";border-top-left-radius:32px}
/* arrow = 30×18 SVG, stroke currentColor 4.5px, round caps/joins; the card has overflow:hidden */
```
**Zigzag bottom edge** (light header band) via `clip-path: polygon(...)` with teeth 14–18px high, 20–44 teeth; **zigzag rule** between sections:
```css
.zz{height:10px;background:linear-gradient(135deg,var(--ink) 25%,transparent 25%) -10px 0,linear-gradient(225deg,var(--ink) 25%,transparent 25%) -10px 0;background-size:20px 20px}
```
**Pills / tiles:** `border:2.5px solid var(--ink); border-radius:999px` (tiles: radius 30% of size).

**Spacing scale:** 4 · 8 · 12 · 16 · 20 (page side padding on the 430px page) · 28 (recap padding) · 44 (link-preview padding, bottom-left anchor).

---

## Avatars

Users have avatars (Duolingo-style flat characters: fox, cat, ghost, frog, chick...). Always **frame** them so any avatar, with any background, looks native:

- **Tilted square** (link preview): 180–250px, `border 5px ink`, `background paper`, shadow `9px 9px 0 ink`, rotate 4°, `overflow:hidden`. A 10-point `accent` "?" starburst may overlap its corner.
- **Starburst circle** (recap card, 76–170px): circle with 5px ring, `accent` ground, shadow `7px 7px 0 ink`, a 12-point `paper` starburst (inner radius 0.8) with 3px ink stroke behind it.
- **Plain circle** (small): 84–104px, 4px ring, `accent` ground, shadow `5px 5px 0`.
- **PersonTile** (results page): rounded-square 24–46px, 2.5px ink border, a pastel ground per person (Mia #fbd9a0, Alex #fff0a0, Jo #d6efa3, Sam #fbd0b0, Kai #f8c8cc); the same person always gets the same ground.
- Raw avatar art: 100×100 viewBox, 3px `ink` outline with round joins, shoulders cut by the bottom edge. Real photos: `object-fit:cover` inside the same frame.

---

## Screens

### 1. Recap card ("Three things about Mia") — 520×660 card on a 560×700 `mat`
- Brand row top-left: little flower mark + "Little Things".
- Title **"Three things about Mia"**: 40px/800, max-width ≈ 280, one ink color. Avatar (starburst circle, 76px) at the right of the title.
- Three tilted **stickers** stacked (see Shape language): label 14/700 over answer 38–42/800. Halftone dots peek out top-right and bottom-left of the sticker column, never under text.
- Footer: QR code in a paper box at the right; at the left, "Scan to see all my answers" (13/700), "What Would You Pick?" (22/800), "Eight questions to play with friends." (13/600).

### 2. Room invite link preview — 1200×630 (chat / social share)

- Lime background, dark outline, hard shadow, Little Things wordmark and one last-bite question.
- Anchor three option chips bottom-left. Place a question-mark starburst over halftone dots on the right.
- Use **Play this round →** in the bottom-right tab. The link opens the invite cover.
- The fixed preview uses the question and options without any player avatar, nickname or selected answer.

### 3. Room reveal (results page)

- Below the title, show the live submission count and a plain roster with avatars and names of submitted players.
- Number and separate question sections with the zigzag rule.
- Use the same choice-question layout for all room sizes. Group each player under the option they picked. Show the count strip only for rounds of three or more. Keep the avatar and name together without an outer pill.
- Keep the numeric question as a ranked bar chart. For assignments, use compact, centered ink pills with lime text for column headings and center each avatar/name pair within its cell.
- Use a light **← My recap** return action at the top. Put the primary invite action above **See my recap** at the bottom.

### 4. Shared recap and solo answers

Use the revised screen 18 question layout to present a single player’s nickname, avatar and eight answers. It is the public destination for the poster QR or recap link. **Try the same quiz** opens the pack cover. Reuse the numbered question sections, choice cards and assignment colors in every Personal recap state. A single-player number displays as a value. Choice positions use lime, pink and orange. Numeric and free-text answers use paper. Q4 colors identify the three recipient columns.

---

## Do / Don't

**Do** keep one ink color for titles; keep text on `paper` or `bg` (never on dots); give each person the same tile color everywhere; anchor options bottom-left and the tab bottom-right with 20px+ clearance; use `bg → pink → peach` in that order for option columns.

**Don't** use dark / black headers or full-bleed dark cards; don't put dots under or beside text so they hurt reading; don't pair pink with green; don't add blurred shadows, gradients or glows; don't turn the CTA into a large filled button; don't tilt content text, only stickers and the avatar frame; don't mix colorways in a single card.

---

## Application screens and local preview

The home, room, quiz, nickname entry, results and missing-room state share the lime accent, warm paper, dark-green ink and hard shadows. The home uses the Everyday Dilemmas illustrated cover. Preserve the bilingual wordmark and use normal Chinese tracking with looser line height than English. In the recap, align the avatar to the visible vertical center of the title block and the QR to the vertical center of the three footer lines.

The local preview switches between screens and room states. The app has a single default palette. Share artwork has its own unlabeled color swatches, with a ring and check to show selection.

## Current screen details

- **Home** uses the Everyday Dilemmas illustration with a light halftone and an ink pill with lime text in the art’s upper right. The pack title sits on one line and the white area contains the subtitle and Start Quiz. The bilingual wordmark stays in the site header.
- **Quiz cards** place the question emoji in a compact sticker that overlaps the top-left edge of the card. The title and controls sit within the card.
- **Avatars** use the supplied set of 20 transparent stickers. Select a contrasting tile fill per sticker from the share palette. Keep each sticker’s tile fill consistent in the picker and the group reveal. On exported artwork the transparent sticker sits inside the card’s own frame and follows its color.
- **Personal result** displays one Pop Cover. The export uses the same 900 × 1200 canvas as the preview. Keep the original staggered stickers, corner dots, heading/avatar alignment and footer-text/QR alignment. The selectable colors apply to the image only.
- **Invites** use the inline room action. The fixed 1200 × 630 teaser is external link-preview artwork. The shared answer page has no header Share action.
- **Group reveal** preserves the two-player split and larger-room vote distributions, with the same comic surface styles for both.

Implementation is in `public/styles.css` and `public/app.js`. Avatar assets are in `public/avatars/`.


## Disabled buttons

Use the native disabled state. Replace the action color with a neutral fill (`#e5e1d7`), use a muted but legible label (`#5c5a50`) and a softer border (`#b6b0a1`), and remove the hard shadow. Keep the button dimensions. Disabled buttons have no press movement.


## Quiz and profile stickers

Use an 84 × 84 px sticker overlapping the top-left edge of both the quiz and Sign your answers cards. Quiz stickers use the question emoji and an individual pastel fill. Sign your answers uses the flower mark on pale yellow. Leave 58 px between quiz progress and the card, and 68 px of top padding inside the card.

## Example ad

Use a full-screen dialog to preserve the quiz or result page underneath. The test state puts **Example ad** inside the animated artwork. The progress bar and countdown sit at the top. The ad fills the remaining viewport, with the reward explanation above the title. Show the primary **Done** button only after completion. Return automatically after two seconds and use a toast to confirm the reward.

## Language control

Show both **EN** and **中文** as header chips. The active language uses ink fill and lime text. Switch to a dropdown when a third language is supported.
