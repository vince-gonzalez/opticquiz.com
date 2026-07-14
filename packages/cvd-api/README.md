# opticquiz-cvd-api

A Cloudflare Worker that exposes the OpticQuiz colorblind-safe checker as a REST API,
so **anything that can hit a URL** can use it — Grok, Gemini, ChatGPT, your website,
a Figma plugin, CI, anything. It runs the live `opticquiz-cvd` npm package, so there
is one source of truth for the engine. Edge-hosted, no server to maintain.

## Endpoints
- `POST /api/check` — body `{ "colors": ["#d7191c","#1a9641","#2166ac"] }` → the full report (`pass`, per-type conflicts with ΔE).
- `POST /api/simulate` — body `{ "color": "#d7191c" }` → protan/deutan/tritan sims; add `"type": "deutan"` for just one.
- `GET /api` — usage + method + DOI.

Returns exactly what the engine computes — pass/fail and real CIEDE2000 numbers. No invented score.

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
