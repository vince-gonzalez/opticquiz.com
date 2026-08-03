#!/usr/bin/env node
/* ===== IMPACT ARCHIVE — MODERATION CLI =====
   The whole review surface. No admin UI to build, no dashboard to maintain.

     export OPTICQUIZ_ADMIN_TOKEN=…        (PowerShell: $env:OPTICQUIZ_ADMIN_TOKEN="…")
     node moderate.mjs list                 show everything waiting
     node moderate.mjs approve oq-1a2b3c4d  publish it
     node moderate.mjs reject  oq-1a2b3c4d  keep the count, never show the words

   Against a local `wrangler dev`:  BASE=http://127.0.0.1:8787/api/impact node moderate.mjs list

   WHAT REVIEW IS FOR, AND WHAT IT IS NOT FOR
     Reject spam, abuse, anything that identifies a third party, and anything that reads
     as a medical claim. Do NOT reject a story because it is unflattering — a negative
     report is the most valuable row in the archive, because it is the one nobody would
     fabricate. Rejecting critical feedback turns a dataset back into marketing.
============================================= */

const BASE = process.env.BASE || "https://api.opticquiz.com/api/impact";
const TOKEN = process.env.OPTICQUIZ_ADMIN_TOKEN || process.env.ADMIN_TOKEN;
const [cmd, id] = process.argv.slice(2);

if (!TOKEN) {
  console.error("Set OPTICQUIZ_ADMIN_TOKEN first (the value you gave `wrangler secret put ADMIN_TOKEN`).");
  process.exit(1);
}
const auth = { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" };
const dim = (s) => "\x1b[2m" + s + "\x1b[0m";
const bold = (s) => "\x1b[1m" + s + "\x1b[0m";

async function list() {
  const r = await fetch(BASE + "/queue", { headers: auth });
  if (!r.ok) { console.error("HTTP " + r.status + " — is the token right?"); process.exit(1); }
  const d = await r.json();
  if (!d.pending) { console.log("\nNothing waiting.\n"); return; }
  console.log("\n" + d.pending + " waiting review\n");
  for (const x of d.records) {
    const tags = [x.helped, x.surface, x.cvd_type, x.role, x.region].filter(Boolean).join(" · ");
    console.log(bold(x.id) + "  " + dim(x.created_utc + "  " + tags));
    if (x.story) console.log("  " + x.story);
    if (x.before_after) console.log("  " + dim(x.before_after));
    console.log(dim("  publishable: " + (x.consent_public ? "yes — they consented" : "NO — counted only, words must never be shown") +
      (x.contact ? "   wants a reply: " + x.contact : "")));
    console.log();
  }
  console.log(dim("node moderate.mjs approve <id>   |   node moderate.mjs reject <id>\n"));
}

async function review(status) {
  if (!id) { console.error("Which record? e.g. node moderate.mjs " + status.replace("ed", "") + " oq-1a2b3c4d"); process.exit(1); }
  const r = await fetch(BASE + "/review", { method: "POST", headers: auth, body: JSON.stringify({ id, status }) });
  const d = await r.json();
  console.log(r.ok ? id + " → " + status : "Failed: " + (d.error || r.status));
  if (r.ok && status === "approved") console.log(dim("Live now at https://opticquiz.com/impact/"));
}

if (cmd === "list") await list();
else if (cmd === "approve") await review("approved");
else if (cmd === "reject") await review("rejected");
else {
  console.log("\nusage:\n  node moderate.mjs list\n  node moderate.mjs approve <id>\n  node moderate.mjs reject <id>\n");
}
