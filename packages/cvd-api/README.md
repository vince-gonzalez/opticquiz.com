# opticquiz-cvd-api

A Cloudflare Worker that exposes the OpticQuiz colorblind-safe checker as a REST API,
so **anything that can hit a URL** can use it — Grok, Gemini, ChatGPT, your website,
a Figma plugin, CI, anything. It runs the live `opticquiz-cvd` npm package, so there
is one source of truth for the engine. Edge-hosted, no server to maintain.

## Endpoints
- `POST /api/check` — body `{ "colors": ["#d7191c","#1a9641","#2166ac"] }` → the full report (`pass`, per-type conflicts with ΔE).
- `POST /api/fix` — body `{ "colors": ["#d7191c","#1a9641"] }` → a colorblind-safe version that stays near the originals (`colors`, `drift`, `pass`).
- `POST /api/contrast` — body `{ "foreground": "#767676", "background": "#ffffff", "large": false }` → WCAG contrast ratio + AA/AAA.
- `POST /api/simulate` — body `{ "color": "#d7191c" }` → protan/deutan/tritan sims; add `"type": "deutan"` for just one.
- `GET /api` — usage + method + DOI.
- `GET /api/badge?colors=…` — a live-verifying SVG badge (it re-checks the colors on every request, so a "pass" cannot be faked).

Returns exactly what the engine computes — pass/fail and real CIEDE2000 numbers. No invented score.

## The impact archive (`/api/impact/*`)

A voluntary, consented, moderated, revocable and citable record of people OpticQuiz has
helped. Backed by D1. The public face is <https://opticquiz.com/impact/>; the collection
widget is `/assets/oq-feedback.js`.

- `POST /api/impact` — a submission. Returns a record id **and a withdraw code**.
- `POST /api/impact/withdraw` — `{ id, code }` deletes the record, permanently, no account.
- `GET  /api/impact/stories[.csv]` — approved **and** consented records. The dataset.
- `GET  /api/impact/stats` — counts over real rows. Includes `no` answers and pending records.
- `GET  /api/impact/adoption` — downloads/installs fetched live from public registries, each
  with the URL it came from. A source that cannot be verified returns `null`, never an estimate.
- `GET  /api/impact/queue`, `POST /api/impact/review` — maintainer only, `Authorization: Bearer $ADMIN_TOKEN`.

Design rules, enforced in code — see `schema.sql`:
nothing is sent without a click · no IP, cookie or page-view is stored against a submission ·
dates are day-precision · publication needs **both** consent and human approval ·
`contact` is never emitted by any public endpoint · consent is revocable forever.

### One-time setup
```
cd C:\Users\Admin\opticquiz.com\packages\cvd-api
npx wrangler login
npx wrangler d1 create opticquiz-impact          # paste the printed id into wrangler.toml
npx wrangler d1 execute opticquiz-impact --remote --file=./schema.sql
npx wrangler secret put ADMIN_TOKEN              # invent a long random string, keep it
npx wrangler secret put RL_SALT                  # any random string
npx wrangler deploy
```
Until `database_id` is filled in, `/api/impact/*` answers 503 and the engine endpoints are
unaffected.

### Moderating
```
$env:OPTICQUIZ_ADMIN_TOKEN="…"
node moderate.mjs list
node moderate.mjs approve oq-1a2b3c4d
```
Reject spam, abuse, anything identifying a third party, and anything that reads as a medical
claim. **Do not reject a story for being unflattering** — a negative report is the row nobody
would fabricate, and cutting it turns a dataset back into marketing.

### Tests
```
npx wrangler d1 execute opticquiz-impact --local --file=./schema.sql
npx wrangler dev --local --port 8787
node test_impact.mjs      # 33 assertions: validation, both publication locks, leak checks, withdrawal, rate limit
```

## Deploy (your Cloudflare account)
```
cd C:\Users\Admin\opticquiz.com
git pull
cd packages\cvd-api
npm install
npx wrangler login          # opens the browser, log into Cloudflare
npx wrangler deploy         # prints a free URL: https://opticquiz-cvd-api.<you>.workers.dev
```
Test it:
```
curl -X POST https://opticquiz-cvd-api.<you>.workers.dev/api/check ^
  -H "Content-Type: application/json" ^
  -d "{\"colors\":[\"#d7191c\",\"#1a9641\",\"#2166ac\"]}"
```
### Optional: serve it from opticquiz.com/api/*
Since opticquiz.com is already on Cloudflare, uncomment the `[[routes]]` block in
`wrangler.toml`, then `npx wrangler deploy` again. The API is then live at
`https://opticquiz.com/api/check`.

## Note
Screening aid, not a legal accessibility (ADA/WCAG) audit. Method: Machado, Oliveira
& Fernandes (2009) + CIEDE2000 — https://doi.org/10.5281/zenodo.21310578
