# Decisions

## Settled

- **Working app name** is Little Things. **First pack** is 日常小事 / Everyday Dilemmas. Chinese product name and public domain are open.
- **Home copy** uses “A game to get to know each other through questions you’d never think to ask.” and “无聊的小事也有意想不到的答案。”
- **One CTA on home** starts the quiz. Share is always in the header. Room creation happens behind the scenes.
- **Async room** uses one invitation link. People choose nicknames and avatars at submission. Only submitted answers enter results.
- **Personal result** defaults to one Pop Cover. Keep color swatches and Save image. Put the challenge thumbnail in the share modal.
- **Result CTA** changes from Share with friends to See everyone’s answers after a second submission. A separate waiting screen is unnecessary in the main flow.
- **Result lines are written by rule, not by a model.** Every personal-card line comes from a trigger table in [RESULT_COPY.md](RESULT_COPY.md): a condition, a template, and a punch score. The card shows the top three. Each question carries a fallback that always fires, so an unremarkable set of answers still fills a card. Rules are free, instant, and cannot invent anything; a model on this path would add latency and risk for copy we can write once.
- **The personal card never reads the room.** Its three lines come from one player's answers alone. The card is what a player shares to pull friends in, so it has to be worth sharing while they are still the only person who has played; waiting for a room to fill would mean the invitation only gets good after it has already worked. It also must not change under someone after they have shared it. Room-relative findings — only you, the highest, unanimous — are real and still shown, on the group page, which is the screen about the room.
- **A model writes at most two lines, on the group page only.** Its job is to connect answers across questions, which is the one thing the computed table cannot show. The computed section renders first and stands alone, so a failed or slow call costs nothing.
- **No line describes a person.** Lines restate answers and count the room. "You kept the last bite" is allowed; "you're possessive about food" is not. This is what keeps the product clear of personality typing, and it applies to model output as much as to templates.
- **Follow-up prompts address the reader, not the player.** The goal is that a friend turns and asks, so the question is written for a third person to ask out loud.
- **New questions are screened by the follow-up test.** A question is in only if the obvious follow-up is one its subject would enjoy answering. A question that makes someone want to change the subject is out, however funny the answer is. This replaced an earlier sensitive-versus-safe judgment, which kept passing questions that were technically harmless and still landed badly.
- **The site is static files on the team domain; rooms live in a hosted database.** HackOnVibe publishes static files only, so no Node process runs in production. The app deploys as plain files from the repository root — deliberately with no `build` script, which is what keeps CI in its static mode — and the browser talks to Postgres at Supabase directly. `storage.js` is the single seam: it keeps the local server as a second backend, so `npm run dev` still works with nothing installed and no key.
- **The anon key ships in the browser and is not a password.** Both tables have row level security on with no policies, so that key cannot read or write a table. Three `security definer` functions are the only way in, which puts the "answer first, then you get to look" rule in the database rather than in client code a player could edit. Player tokens never leave it.
- **Personalised link previews are given up.** Scrapers do not run JavaScript and there is no server to rewrite the page, so a shared challenge link shows one fixed card instead of the friend's name. The alternative was a server, which the host does not offer.

- **Visual system** uses Bricolage Grotesque for English and the bilingual wordmark, 得意黑 for Chinese, pop-comic outlines, hard shadows and lime as the main app accent. Question banners have their own colors. Both stars on each banner share one contrasting color.

## Prototype choices and open work

- `config.js` still needs the Supabase anon key, and `supabase/schema.sql` still needs to be run once, before the deployed site can open a room. Cross-device verification is pending on that.
- The five-seat strip is a Demo sample. A real cap, join status and occupancy rules remain open. Rewarded ads for more seats are an idea.
- The group prompt uses rules based on answers. The model-written connecting line can follow once sharing and submission are reliable.
- The group page still shows a rules-based prompt only. The room-relative findings moved off the personal card have not been added to it yet, and neither has the model-written connecting line.
- Future packs include 难选局, a Chinese-first food pack, and a dating pack. Each gets its own name and questions.
