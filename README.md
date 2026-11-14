# Little Things

Eight small questions. Answer them, then see how your friends answered.

The playable pack is **日常小事 / Everyday Dilemmas**, bilingual throughout.
See [docs/](docs/README.md) for the design system, user flow, question pack,
result copy and the decisions behind them.

## How this is deployed

HackOnVibe serves **static files only** — no Node process runs in production.
So the site is the plain files in this repository, and the rooms live in a hosted
Postgres database at Supabase that the browser talks to directly.

- There is **no `build` script** in `package.json`, on purpose. That is what tells
  HackOnVibe CI to publish this folder as-is. Adding one changes the build mode.
- `index.html` must stay at the repository root.
- `.github/workflows/deploy.yml` is managed by the platform and restored if edited.
  Change the app, not the workflow.

### First-time database setup

1. In the Supabase dashboard, open **SQL Editor → New query**, paste
   [`supabase/schema.sql`](supabase/schema.sql) and run it. It creates the two
   tables and the three functions the app calls.
2. Copy the project URL and the **anon / publishable** key from
   **Project Settings → API Keys** into [`config.js`](config.js).

Both of those values are public by design — the anon key ships in the browser.
Row level security is on for both tables with no policies, so that key cannot read
or write a table directly; it can only call the three `security definer` functions,
which hold the rules. The `service_role` key must never go in this repository.

## Running it locally

```
npm run dev
```

Then open http://127.0.0.1:4188. No `npm install` needed — the server has no
dependencies and the QR encoder is vendored in `vendor/`.

With no key in `config.js`, the app falls back to the local Node server in
`server.js`, which keeps rooms in `rooms.local.json`. **That file holds player
tokens and is gitignored. Never commit or publish it.** Fill in the key and the
same code path talks to Supabase instead.

To play as two people on one computer, open the invite link in a normal window and
a private window.

Open http://127.0.0.1:4188/?debug=1 for the page switcher and sample result states.
It uses sample answers in memory and does not create rooms.

## Where things live

| Path | What |
| --- | --- |
| `index.html`, `styles.css` | The page shell and the whole visual system |
| `app.js` | The app: screens, result cards, share images |
| `questions.js` | The eight questions, both languages |
| `storage.js` | The only file that knows where rooms are kept |
| `config.js` | Supabase project URL and anon key |
| `supabase/schema.sql` | Tables, access rules, and the three callable functions |
| `vendor/qrcode.esm.js` | QR encoder, bundled from `qrcode@1.5.4` (MIT) |
| `server.js` | Local playtest server only. Not used in production |

## Known limits

- **Link previews are not personalised.** A challenge link shared into a chat app
  shows one fixed card, because previews are scraped without running JavaScript and
  there is no server to rewrite the page. Locally, `server.js` still personalises it.
- Recap QR codes need the public HTTPS address to be scannable from another device.
