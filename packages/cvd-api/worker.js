import cvd from "opticquiz-cvd";

/* ===== OPTICQUIZ API WORKER =====
   Two things live here:
     1. THE ENGINE  — /api/check /fix /simulate /contrast /badge  (stateless, always has been)
     2. THE ARCHIVE — /api/impact/*                               (D1-backed, consented)

   The archive exists to answer one question with evidence instead of adjectives:
   "did this actually help anyone?" It is voluntary, consented, moderated, revocable,
   and published under CC BY 4.0 so it can be cited. Read schema.sql before changing it.
===== END ===== */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS, ...extra } });

// A self-verifying shields-style SVG badge. It RE-CHECKS the given colors live, so a
// "pass" can't be faked — the honesty is the point (the badge is the certification seed).
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function badge(label, value, ok) {
  const lw = Math.round(6.4 * label.length + 12), vw = Math.round(6.4 * value.length + 14), w = lw + vw;
  const color = ok ? "#3fb950" : "#e05d44";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<rect rx="3" width="${w}" height="20" fill="#555"/><rect rx="3" x="${lw}" width="${vw}" height="20" fill="${color}"/>
<rect rx="3" width="${w}" height="20" fill="url(#s)"/>
<g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,Geneva,sans-serif" font-size="11">
<text x="${lw / 2}" y="14">${esc(label)}</text><text x="${lw + vw / 2}" y="14">${esc(value)}</text></g></svg>`;
}
const svg = (s) => new Response(s, { headers: { "Content-Type": "image/svg+xml;charset=utf-8", "Cache-Control": "max-age=300", "Access-Control-Allow-Origin": "*" } });

/* ────────────────────────────────────────────────────────────────
   IMPACT ARCHIVE
──────────────────────────────────────────────────────────────── */

// Controlled vocabularies. A closed vocabulary is what makes the dataset analysable
// later; free text in these columns would make the archive un-citable.
const SURFACES = new Set([
  "vision-test", "color-test", "checker", "palettes", "contrast-checker", "live-camera",
  "widget", "extension", "desktop-app", "vscode", "api", "package", "mcp", "github-action",
  "guide", "other"
]);
const HELPED = new Set(["yes", "partly", "no"]);
const CVD_TYPES = new Set(["protan", "deutan", "tritan", "achroma", "other", "unknown", "none", "undisclosed"]);
const ROLES = new Set(["person", "developer", "designer", "educator", "clinician", "researcher", "parent", "other"]);

const LIMITS = { story: 2000, before_after: 1000, region: 60, contact: 120, version: 40 };

const today = () => new Date().toISOString().slice(0, 10);        // DAY precision. deliberate.
const clean = (v, max) => {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
};

async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomId(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Human-transcribable code (no 0/O/1/I) — people write these down.
function withdrawCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  const s = [...a].map((b) => alphabet[b % alphabet.length]).join("");
  return s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8, 12);
}

// Abuse control only. See schema.sql — this hash cannot be reversed to an IP, is never
// stored alongside a submission, and is purged hourly.
async function rateLimited(env, request, max = 5) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (!ip) return false;
  const hour = Math.floor(Date.now() / 3600000);
  const salt = (env.RL_SALT || "opticquiz-impact") + ":" + hour;
  const k = (await sha256(salt + ip)).slice(0, 24) + ":" + hour;
  await env.IMPACT.prepare("DELETE FROM rl WHERE exp < ?1").bind(hour).run();
  const row = await env.IMPACT.prepare("SELECT n FROM rl WHERE k = ?1").bind(k).first();
  const n = row ? row.n : 0;
  if (n >= max) return true;
  await env.IMPACT.prepare(
    "INSERT INTO rl (k, n, exp) VALUES (?1, 1, ?2) ON CONFLICT(k) DO UPDATE SET n = n + 1"
  ).bind(k, hour).run();
  return false;
}

const publicFields =
  "id, created_utc, helped, surface, cvd_type, role, region, story, before_after, version";

function csvCell(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

async function handleImpact(request, env, url, path) {
  if (!env.IMPACT) {
    return json({
      error: "The impact archive is not configured on this deployment.",
      fix: "Create the D1 database and bind it as IMPACT — see packages/cvd-api/README.md."
    }, 503);
  }
  const sub = path.replace(/^.*\/api\/impact/, "") || "/";

  /* ---- docs ---- */
  if (request.method === "GET" && sub === "/") {
    return json({
      service: "opticquiz-impact-archive",
      what: "A voluntary, consented, moderated, revocable record of people OpticQuiz helped.",
      page: "https://opticquiz.com/impact/",
      license: "CC BY 4.0 — attribute to OpticQuiz (https://opticquiz.com/impact/)",
      collected: "only what a person typed and submitted. no IP, no cookie, no user-agent, no page-view record.",
      date_precision: "day",
      publication: "nothing is public until it is both consented (consent_public) and manually approved (status=approved).",
      revocation: "every submitter receives a withdraw code; POST /api/impact/withdraw removes the record permanently.",
      endpoints: {
        "POST /api/impact": '{ "helped":"yes|partly|no", "surface":"extension", "story":"...", "consent_public":true }',
        "POST /api/impact/withdraw": '{ "id":"oq-...", "code":"ABCD-EFGH-JKLM" }',
        "GET  /api/impact/stories": "?limit=50&offset=0 — approved, consented records",
        "GET  /api/impact/stories.csv": "the same records as CSV, for citation",
        "GET  /api/impact/stats": "aggregate counts, computed live from real rows only",
        "GET  /api/impact/adoption": "download/install counts fetched from public registries, with source URLs"
      },
      vocabularies: {
        helped: [...HELPED], surface: [...SURFACES], cvd_type: [...CVD_TYPES], role: [...ROLES]
      }
    });
  }

  /* ---- submit ---- */
  if (request.method === "POST" && sub === "/") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

    if (body.website) return json({ error: "Rejected." }, 400);           // honeypot
    if (!HELPED.has(body.helped)) return json({ error: 'helped must be one of: yes, partly, no.' }, 400);
    if (!SURFACES.has(body.surface)) return json({ error: "Unknown surface.", allowed: [...SURFACES] }, 400);

    if (await rateLimited(env, request)) {
      return json({ error: "Too many submissions from this connection in the last hour. Try again later." }, 429);
    }

    const cvd_type = CVD_TYPES.has(body.cvd_type) ? body.cvd_type : null;
    const role = ROLES.has(body.role) ? body.role : null;
    const story = clean(body.story, LIMITS.story);
    const before_after = clean(body.before_after, LIMITS.before_after);
    const region = clean(body.region, LIMITS.region);
    const contact = clean(body.contact, LIMITS.contact);
    const version = clean(body.version, LIMITS.version);

    // Consent only means something if there is something to publish.
    const consent_public = body.consent_public === true && !!(story || before_after) ? 1 : 0;

    const id = "oq-" + randomId(4);
    const code = withdrawCode();
    const withdraw_hash = await sha256(id + ":" + code);

    await env.IMPACT.prepare(
      `INSERT INTO impact (id, created_utc, helped, surface, cvd_type, role, region, story,
        before_after, consent_public, contact, version, status, withdraw_hash)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,'pending',?13)`
    ).bind(id, today(), body.helped, body.surface, cvd_type, role, region, story,
      before_after, consent_public, contact, version, withdraw_hash).run();

    return json({
      ok: true,
      id,
      withdraw_code: code,
      note: consent_public
        ? "Saved. Nothing appears publicly until a human reviews it. Keep the withdraw code — it removes your record permanently, no account needed."
        : "Saved as a private count only — you did not consent to publication, so no words of yours will ever be shown.",
      status: "pending"
    }, 201);
  }

  /* ---- withdraw (revocable consent, no account) ---- */
  if (request.method === "POST" && sub === "/withdraw") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
    const id = clean(body.id, 40), code = clean(body.code, 40);
    if (!id || !code) return json({ error: 'Expected { "id": "oq-...", "code": "ABCD-EFGH-JKLM" }.' }, 400);
    const want = await sha256(id + ":" + code.toUpperCase());
    const row = await env.IMPACT.prepare("SELECT withdraw_hash FROM impact WHERE id = ?1").bind(id).first();
    if (!row || row.withdraw_hash !== want) return json({ error: "No record matches that id and code." }, 404);
    await env.IMPACT.prepare("DELETE FROM impact WHERE id = ?1").bind(id).run();
    return json({ ok: true, id, status: "withdrawn", note: "Deleted. It is gone from the archive and from every export." });
  }

  /* ---- public stories ---- */
  if (request.method === "GET" && (sub === "/stories" || sub === "/stories.csv")) {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 500);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0);
    const { results } = await env.IMPACT.prepare(
      `SELECT ${publicFields} FROM impact
        WHERE status = 'approved' AND consent_public = 1
        ORDER BY created_utc DESC, id DESC LIMIT ?1 OFFSET ?2`
    ).bind(limit, offset).all();

    if (sub === "/stories.csv") {
      const cols = publicFields.split(",").map((s) => s.trim());
      const lines = [cols.join(",")].concat(
        (results || []).map((r) => cols.map((c) => csvCell(r[c])).join(","))
      );
      return new Response(lines.join("\n") + "\n", {
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": 'attachment; filename="opticquiz-impact-archive.csv"',
          "Cache-Control": "max-age=300",
          ...CORS
        }
      });
    }
    return json({
      license: "CC BY 4.0",
      source: "https://opticquiz.com/impact/",
      note: "Self-reported and voluntary. Not a random sample, not a clinical outcome measure.",
      count: (results || []).length,
      stories: results || []
    }, 200, { "Cache-Control": "max-age=300" });
  }

  /* ---- aggregate stats (computed from real rows; nothing hardcoded) ---- */
  if (request.method === "GET" && sub === "/stats") {
    const one = async (sql, ...b) => (await env.IMPACT.prepare(sql).bind(...b).first()) || {};
    const many = async (sql) => ((await env.IMPACT.prepare(sql).all()).results) || [];

    const totals = await one(
      `SELECT COUNT(*) AS responses,
              SUM(CASE WHEN helped='yes'    THEN 1 ELSE 0 END) AS helped_yes,
              SUM(CASE WHEN helped='partly' THEN 1 ELSE 0 END) AS helped_partly,
              SUM(CASE WHEN helped='no'     THEN 1 ELSE 0 END) AS helped_no,
              MIN(created_utc) AS first_response,
              MAX(created_utc) AS latest_response
         FROM impact WHERE status IN ('pending','approved')`
    );
    const published = await one(
      `SELECT COUNT(*) AS n FROM impact WHERE status='approved' AND consent_public=1`
    );
    const bySurface = await many(
      `SELECT surface, COUNT(*) AS n,
              SUM(CASE WHEN helped='yes' THEN 1 ELSE 0 END) AS yes
         FROM impact WHERE status IN ('pending','approved') GROUP BY surface ORDER BY n DESC`
    );
    const byType = await many(
      `SELECT cvd_type, COUNT(*) AS n FROM impact
        WHERE status IN ('pending','approved') AND cvd_type IS NOT NULL
        GROUP BY cvd_type ORDER BY n DESC`
    );
    return json({
      generated_utc: new Date().toISOString(),
      note: "Every number here is a COUNT over rows a person voluntarily submitted. 'no' answers are counted and published alongside 'yes' answers on purpose.",
      totals, published_stories: published.n || 0, by_surface: bySurface, by_cvd_type: byType
    }, 200, { "Cache-Control": "max-age=120" });
  }

  /* ---- adoption: real numbers from public registries, or null ---- */
  if (request.method === "GET" && sub === "/adoption") {
    return json(await adoption(env), 200, { "Cache-Control": "max-age=1800" });
  }

  /* ---- maintainer: queue + review ---- */
  const auth = request.headers.get("Authorization") || "";
  const isAdmin = env.ADMIN_TOKEN && auth === "Bearer " + env.ADMIN_TOKEN;

  if (sub === "/queue" || sub === "/review") {
    if (!isAdmin) return json({ error: "Unauthorized." }, 401);

    if (request.method === "GET" && sub === "/queue") {
      const { results } = await env.IMPACT.prepare(
        `SELECT id, created_utc, helped, surface, cvd_type, role, region, story, before_after,
                consent_public, contact, version, status
           FROM impact WHERE status = 'pending' ORDER BY created_utc ASC, id ASC LIMIT 200`
      ).all();
      return json({ pending: (results || []).length, records: results || [] });
    }
    if (request.method === "POST" && sub === "/review") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
      const id = clean(body.id, 40);
      const status = ["approved", "rejected"].includes(body.status) ? body.status : null;
      if (!id || !status) return json({ error: 'Expected { "id": "oq-...", "status": "approved|rejected" }.' }, 400);
      const r = await env.IMPACT.prepare(
        "UPDATE impact SET status = ?1, reviewed_utc = ?2 WHERE id = ?3"
      ).bind(status, today(), id).run();
      if (!r.meta || r.meta.changes === 0) return json({ error: "No such record." }, 404);
      return json({ ok: true, id, status });
    }
  }

  return json({ error: "Unknown impact endpoint. GET /api/impact for usage." }, 404);
}

/* ---- adoption numbers -----------------------------------------------------
   Every number below is fetched at runtime from a public endpoint and returned
   WITH the URL it came from, so a reader can re-run the request. A failed fetch
   returns null and an error string. We never carry a stale number forward as if
   it were current, and we never estimate one.
--------------------------------------------------------------------------- */
const NPM_PACKAGES = ["opticquiz-cvd", "opticquiz-eye", "opticquiz-cvd-mcp"];

async function getJSON(u, init) {
  const r = await fetch(u, { ...init, headers: { "User-Agent": "opticquiz-adoption/1.0 (+https://opticquiz.com)", ...(init && init.headers) } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}

async function adoption(env) {
  const CACHE_MINUTES = 60;
  const cached = await env.IMPACT.prepare("SELECT json, fetched_utc FROM adoption_cache WHERE k='adoption'").first();
  if (cached) {
    const age = (Date.now() - Date.parse(cached.fetched_utc)) / 60000;
    if (age < CACHE_MINUTES) return { ...JSON.parse(cached.json), cache: { age_minutes: Math.round(age) } };
  }

  const sources = {};

  await Promise.all(NPM_PACKAGES.map(async (p) => {
    const src = `https://api.npmjs.org/downloads/point/last-month/${p}`;
    try {
      const d = await getJSON(src);
      sources["npm:" + p] = { downloads_last_30_days: d.downloads, period: { start: d.start, end: d.end }, source: src };
    } catch (e) {
      sources["npm:" + p] = { downloads_last_30_days: null, error: String(e.message || e), source: src };
    }
  }));

  const pypiSrc = "https://pypistats.org/api/packages/opticquiz-cvd/recent";
  try {
    const d = await getJSON(pypiSrc);
    sources["pypi:opticquiz-cvd"] = {
      downloads_last_day: d.data && d.data.last_day, downloads_last_week: d.data && d.data.last_week,
      downloads_last_month: d.data && d.data.last_month, source: pypiSrc
    };
  } catch (e) {
    sources["pypi:opticquiz-cvd"] = { downloads_last_month: null, error: String(e.message || e), source: pypiSrc };
  }

  const vsSrc = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
  try {
    const d = await getJSON(vsSrc, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json;api-version=7.2-preview.1" },
      body: JSON.stringify({
        filters: [{ criteria: [{ filterType: 7, value: "opticquiz.opticquiz-colorblind-check" }], pageSize: 1, pageNumber: 1 }],
        flags: 914
      })
    });
    const ext = d.results && d.results[0] && d.results[0].extensions && d.results[0].extensions[0];
    const stat = (name) => {
      const s = ext && ext.statistics && ext.statistics.find((x) => x.statisticName === name);
      return s ? s.value : null;
    };
    // Only claim a listing exists when the Marketplace actually returns one. As of the
    // last check the extension query returns TotalCount 0 and the item page 404s — the
    // .vsix is built but not published — so this reports null rather than linking a 404.
    sources["vscode-marketplace"] = ext
      ? {
          installs: stat("install"), downloads: stat("downloadCount"), source: vsSrc,
          listing: "https://marketplace.visualstudio.com/items?itemName=opticquiz.opticquiz-colorblind-check"
        }
      : { installs: null, error: "no published extension matches opticquiz.opticquiz-colorblind-check", source: vsSrc };
  } catch (e) {
    sources["vscode-marketplace"] = { installs: null, error: String(e.message || e), source: vsSrc };
  }

  const ghSrc = "https://api.github.com/repos/zengineco/opticquiz.com";
  try {
    const d = await getJSON(ghSrc);
    sources["github"] = { stars: d.stargazers_count, forks: d.forks_count, watchers: d.subscribers_count, source: ghSrc };
  } catch (e) {
    sources["github"] = { stars: null, error: String(e.message || e), source: ghSrc };
  }

  // Chrome Web Store publishes no machine-readable install count. We say so rather than
  // inventing, estimating, or hand-typing a number that would silently go stale.
  // The Chrome Web Store publishes no machine-readable install count, and we do not have a
  // verified direct listing URL — the site itself links to a store search. So: null, and a
  // search link that resolves. Nothing here is estimated or hand-typed.
  sources["chrome-web-store"] = {
    installs: null,
    note: "The Chrome Web Store exposes no public API for install counts.",
    listing: "https://chromewebstore.google.com/search/opticquiz"
  };

  const out = {
    generated_utc: new Date().toISOString(),
    note: "Fetched live from public registry APIs. A null value means that source could not be verified at this moment — it is never replaced with an estimate.",
    sources
  };
  await env.IMPACT.prepare(
    "INSERT INTO adoption_cache (k, json, fetched_utc) VALUES ('adoption', ?1, ?2) ON CONFLICT(k) DO UPDATE SET json = ?1, fetched_utc = ?2"
  ).bind(JSON.stringify(out), new Date().toISOString()).run();
  return out;
}

/* ────────────────────────────────────────────────────────────── */

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    if (path.includes("/api/impact") || path.endsWith("/impact")) {
      return handleImpact(request, env, url, path);
    }

    if (request.method === "GET" && (path === "" || path.endsWith("/api"))) {
      return json({
        service: "opticquiz-cvd",
        docs: "https://opticquiz.com/checker",
        method: "Machado 2009 + CIEDE2000 (https://doi.org/10.5281/zenodo.21310578)",
        note: "Screening aid, not a legal accessibility audit.",
        endpoints: {
          "POST /api/check": '{ "colors": ["#d7191c","#1a9641","#2166ac"] }',
          "POST /api/fix": '{ "colors": ["#d7191c","#1a9641"] }',
          "POST /api/simulate": '{ "color": "#d7191c", "type": "deutan" }',
          "POST /api/contrast": '{ "foreground": "#767676", "background": "#ffffff", "large": false }',
          "GET  /api/badge": '?colors=d7191c,1a9641,2166ac  → a live-verified SVG badge',
          "GET  /api/impact": "the consented impact archive — stories, stats, adoption"
        }
      });
    }

    // Live-verifying badge: <img src="https://api.opticquiz.com/api/badge?colors=..">
    if (request.method === "GET" && path.endsWith("/badge")) {
      const colors = (url.searchParams.get("colors") || "").split(",").map((s) => s.trim()).filter(Boolean);
      if (colors.length < 2) return svg(badge("colorblind-safe", "add ?colors=", false));
      let r;
      try { r = cvd.checkPalette(colors); } catch { return svg(badge("colorblind-safe", "bad colors", false)); }
      const n = ["protan", "deutan", "tritan"].reduce((a, t) => a + r.types[t].conflicts.length, 0);
      return svg(badge("colorblind-safe", r.pass ? "✓ pass" : "✗ " + n + " conflict" + (n === 1 ? "" : "s"), r.pass));
    }

    if (request.method !== "POST") return json({ error: "Use POST. See /api for usage." }, 405);

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

    if (path.endsWith("/check")) {
      if (!Array.isArray(body.colors)) return json({ error: 'Expected { "colors": ["#hex", ...] }.' }, 400);
      return json(cvd.checkPalette(body.colors));
    }
    if (path.endsWith("/fix")) {
      if (!Array.isArray(body.colors)) return json({ error: 'Expected { "colors": ["#hex", ...] }.' }, 400);
      return json(cvd.fixPalette(body.colors));
    }
    if (path.endsWith("/simulate")) {
      if (!body.color) return json({ error: 'Expected { "color": "#hex", "type"?: "protan|deutan|tritan" }.' }, 400);
      if (body.type) return json({ color: body.color, type: body.type, result: cvd.simulate(body.color, body.type) });
      return json({
        color: body.color,
        protan: cvd.simulate(body.color, "protan"),
        deutan: cvd.simulate(body.color, "deutan"),
        tritan: cvd.simulate(body.color, "tritan")
      });
    }
    if (path.endsWith("/contrast")) {
      if (!body.foreground || !body.background) return json({ error: 'Expected { "foreground": "#hex", "background": "#hex", "large"?: bool }.' }, 400);
      return json(cvd.checkContrast(body.foreground, body.background, { large: !!body.large }));
    }
    return json({ error: "Unknown endpoint.", endpoints: ["/api/check", "/api/fix", "/api/simulate", "/api/contrast", "/api/impact"] }, 404);
  }
};
