import cvd from "opticquiz-cvd";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

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

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

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
          "GET  /api/badge": '?colors=d7191c,1a9641,2166ac  → a live-verified SVG badge'
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
    return json({ error: "Unknown endpoint.", endpoints: ["/api/check", "/api/fix", "/api/simulate", "/api/contrast"] }, 404);
  }
};
