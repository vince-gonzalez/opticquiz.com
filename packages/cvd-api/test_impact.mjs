/* Lifecycle test for the impact archive.
   Run the worker first:  npx wrangler dev --local --port 8787
   Then:                  node test_impact.mjs
   Expects .dev.vars ADMIN_TOKEN=local-test-token
*/
const BASE = process.env.BASE || "http://127.0.0.1:8787/api/impact";
const TOKEN = process.env.ADMIN_TOKEN || "local-test-token";
let failed = 0;

const ok = (name, cond, extra) => {
  console.log((cond ? "  ok   " : "  FAIL ") + name + (cond || extra === undefined ? "" : "  → " + JSON.stringify(extra)));
  if (!cond) failed++;
};
// Local `wrangler dev` does not synthesise cf-connecting-ip, so we send one to exercise
// the rate limiter. In production Cloudflare sets this header itself and a client cannot
// forge it, so sending it here is a test affordance, not a hole. A fresh pseudo-IP per
// run keeps the hourly bucket clean when the test is run repeatedly.
const RUN_IP = "203.0.113." + (1 + Math.floor(Math.random() * 250));
const post = async (path, body, headers) => {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "cf-connecting-ip": RUN_IP, ...headers },
    body: JSON.stringify(body)
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const get = async (path, headers) => {
  const r = await fetch(BASE + path, { headers });
  const t = await r.text();
  try { return { status: r.status, json: JSON.parse(t), text: t }; } catch { return { status: r.status, text: t }; }
};

// The local database persists across runs, so every count below is asserted as a DELTA
// against this baseline rather than as an absolute.
const base = (await get("/stats")).json;
const B = {
  responses: base.totals.responses || 0,
  no: base.totals.helped_no || 0,
  published: base.published_stories || 0,
  surfaces: (base.by_surface || []).map((s) => s.surface)
};

console.log("\nVALIDATION");
ok("rejects unknown helped value", (await post("", { helped: "maybe", surface: "checker" })).status === 400);
ok("rejects unknown surface", (await post("", { helped: "yes", surface: "hacker" })).status === 400);
ok("rejects honeypot", (await post("", { helped: "yes", surface: "checker", website: "spam" })).status === 400);

console.log("\nSUBMIT");
const a = await post("", {
  helped: "yes", surface: "extension", cvd_type: "deutan", role: "developer", region: "Ohio, USA",
  story: "I could finally read the red/green build status dots in our CI dashboard.",
  before_after: "Before: I asked a colleague which builds were broken. Now I can see it.",
  consent_public: true, contact: "someone@example.com", version: "1.0.1"
});
ok("submit accepted", a.status === 201, a.json);
ok("returns a record id", /^oq-[0-9a-f]{8}$/.test(a.json.id || ""), a.json.id);
ok("returns a withdraw code", /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(a.json.withdraw_code || ""), a.json.withdraw_code);
ok("starts pending", a.json.status === "pending");

const b = await post("", { helped: "no", surface: "live-camera", story: "Too dark on my phone to be useful.", consent_public: true });
ok("negative answer accepted too", b.status === 201);

const c = await post("", { helped: "partly", surface: "checker" });
ok("click-only answer accepted", c.status === 201);
ok("click-only is not consented", /private count only/.test(c.json.note || ""), c.json.note);

console.log("\nPRIVACY / PUBLICATION LOCKS");
let pub = await get("/stories");
ok("nothing public before approval", !(pub.json.stories || []).some((s) => s.id === a.json.id || s.id === b.json.id));

const q = await get("/queue", { Authorization: "Bearer " + TOKEN });
ok("queue requires auth", (await get("/queue")).status === 401);
ok("queue lists the pending records", (q.json.records || []).filter((r) => [a.json.id, b.json.id, c.json.id].includes(r.id)).length === 3, q.json.pending);

ok("review rejects bad status", (await post("/review", { id: a.json.id, status: "nope" }, { Authorization: "Bearer " + TOKEN })).status === 400);
ok("approve works", (await post("/review", { id: a.json.id, status: "approved" }, { Authorization: "Bearer " + TOKEN })).status === 200);
ok("approve negative story too", (await post("/review", { id: b.json.id, status: "approved" }, { Authorization: "Bearer " + TOKEN })).status === 200);

pub = await get("/stories");
const mine = (pub.json.stories || []).filter((s) => [a.json.id, b.json.id].includes(s.id));
ok("approved + consented stories are public", mine.length === 2, mine.length);
ok("click-only record never surfaces", !(pub.json.stories || []).some((s) => s.id === c.json.id));
const leaked = JSON.stringify(pub.json);
ok("contact email never published", !leaked.includes("someone@example.com"));
ok("withdraw hash never published", !leaked.includes("withdraw_hash"));
ok("status never published", !leaked.includes('"status"'));
ok("date is day precision", /^\d{4}-\d{2}-\d{2}$/.test((mine[0] || {}).created_utc || ""), (mine[0] || {}).created_utc);

console.log("\nEXPORTS");
const csv = await get("/stories.csv");
ok("csv exports", csv.status === 200 && csv.text.split("\n")[0].startsWith("id,created_utc,helped"));
ok("csv escapes commas", csv.text.includes('"'), csv.text.split("\n")[1]);
ok("csv omits contact", !csv.text.includes("someone@example.com"));

const st = await get("/stats");
ok("stats counts every response", st.json.totals.responses - B.responses === 3, st.json.totals);
ok("stats counts the 'no' answer", st.json.totals.helped_no - B.no === 1, st.json.totals);
ok("stats counts published stories", st.json.published_stories - B.published === 2, st.json.published_stories);
ok("stats groups by surface", Array.isArray(st.json.by_surface) && st.json.by_surface.length >= 3, st.json.by_surface);

console.log("\nWITHDRAWAL (revocable consent)");
ok("wrong code rejected", (await post("/withdraw", { id: a.json.id, code: "AAAA-BBBB-CCCC" })).status === 404);
ok("right code accepted", (await post("/withdraw", { id: a.json.id, code: a.json.withdraw_code })).status === 200);
pub = await get("/stories");
ok("withdrawn record is gone from stories", !(pub.json.stories || []).some((s) => s.id === a.json.id));
const st2 = await get("/stats");
ok("withdrawn record is gone from the counts", st2.json.totals.responses - B.responses === 2, st2.json.totals);
ok("second withdrawal is a 404", (await post("/withdraw", { id: a.json.id, code: a.json.withdraw_code })).status === 404);

console.log("\nRATE LIMIT");
let limited = false;
for (let i = 0; i < 8; i++) {
  const r = await post("", { helped: "yes", surface: "other" });
  if (r.status === 429) { limited = true; break; }
}
ok("floods are rate-limited", limited);

console.log("\nENGINE STILL WORKS");
const eng = await fetch(BASE.replace("/impact", "/check"), {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ colors: ["#d7191c", "#1a9641", "#2166ac"] })
});
const engJson = await eng.json();
ok("POST /api/check unaffected", eng.status === 200 && typeof engJson.pass === "boolean", engJson.pass);

console.log(failed ? `\n${failed} FAILED\n` : "\nall passed\n");
process.exit(failed ? 1 : 0);
