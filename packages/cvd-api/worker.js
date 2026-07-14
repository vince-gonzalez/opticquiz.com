import cvd from "opticquiz-cvd";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

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
          "POST /api/simulate": '{ "color": "#d7191c", "type": "deutan" }',
          "POST /api/contrast": '{ "foreground": "#767676", "background": "#ffffff", "large": false }'
        }
      });
    }
    if (request.method !== "POST") return json({ error: "Use POST. See /api for usage." }, 405);

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

    if (path.endsWith("/check")) {
      if (!Array.isArray(body.colors)) return json({ error: 'Expected { "colors": ["#hex", ...] }.' }, 400);
      return json(cvd.checkPalette(body.colors));
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
    return json({ error: "Unknown endpoint.", endpoints: ["/api/check", "/api/simulate", "/api/contrast"] }, 404);
  }
};
