#!/usr/bin/env node
/* verify-widget.js — the published guarantees of /widget/eye.js, checked against our own engine.
 *
 *   node tools/verify-widget.js            # check the widget
 *   node tools/verify-widget.js --json     # machine-readable, for CI
 *
 * WHY THIS FILE EXISTS
 * The widget makes claims in public: that while a correction mode is on, no run of text falls
 * below WCAG AA, that photographs are never altered, and that color separation improves for the
 * people it is for. Claims like that are worth exactly as much as the command that re-checks
 * them. This is that command. It runs against the shipped bytes of widget/eye.js — it does not
 * reimplement the maths, it reaches into the file and calls the real functions, so the file
 * cannot drift away from the thing being verified.
 *
 * It computes contrast and color difference with opticquiz-cvd — our own published engine, the
 * same one on npm and PyPI and behind the VS Code extension. That is deliberate. If the widget
 * and the engine ever disagreed about what a contrast ratio is, every number on the site would
 * be suspect, so gate 6 holds them against each other across the color cube and fails on any
 * difference at all. Using the package here is also the honest test of it: a library its own
 * authors route around is not a library anyone should depend on.
 *
 * Exit status is 0 when every gate passes and 1 otherwise, so CI can gate a deploy on it.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WIDGET = path.join(ROOT, "widget", "eye.js");
const ENGINE = path.join(ROOT, "packages", "cvd-js", "index.js");
const JSON_OUT = process.argv.includes("--json");

const cvd = require(ENGINE);

/* ---- load the real functions out of the shipped widget ---------------------------------- */
// The widget is an IIFE that mounts itself into a page. Replace its final mount call with an
// export of the internals, then run it with no DOM. Nothing else about the file is altered,
// so what gets measured below is what gets served.
function loadWidget() {
  const src = fs.readFileSync(WIDGET, "utf8");
  const harness = src.replace(
    /if \(document\.readyState === "loading"\)[\s\S]*$/,
    `module.exports = { correctGraphic, correctKeepLum, inkFor, worstRatio, blend, M, MODES,
       parse, fmt, lum, ratio, stopsOf, extremes, browserTarget, STORE };\n})();\n`
  );
  if (harness === src) {
    throw new Error("could not find the widget's mount call — has widget/eye.js been restructured?");
  }
  const mod = { exports: {} };
  new Function("module", "window", "document", "navigator", harness)(
    mod, { matchMedia: null }, {}, { userAgent: "" }
  );
  return mod.exports;
}

const W = loadWidget();
const hex = (a) => "#" + a.map((v) => ("0" + v.toString(16)).slice(-2)).join("");

const gates = [];
function gate(name, pass, detail) {
  gates.push({ name, pass: !!pass, detail: detail || "" });
}

/* ---- 1. the headline claim: text is never below AA, for any backdrop -------------------- */
// Text is forced to pure black or pure white, whichever reads better. The worst case is a
// backdrop at relative luminance 0.179, where the two tie at 4.58:1. That is arithmetic, not a
// sample — but a sample that disagreed would mean the implementation does not match the
// argument, so sweep the cube at a stride that lands near the tie point.
{
  let worst = Infinity, worstBg = null, n = 0;
  for (let r = 0; r < 256; r += 3) for (let g = 0; g < 256; g += 3) for (let b = 0; b < 256; b += 3) {
    const bg = [r, g, b];
    const rr = cvd.contrastRatio(hex(W.inkFor([bg])), hex(bg));   // our own engine, not a local copy
    n++;
    if (rr < worst) { worst = rr; worstBg = bg; }
  }
  gate("text never falls below WCAG AA", worst >= 4.5,
    `worst ${worst.toFixed(3)}:1 at ${hex(worstBg)} over ${n.toLocaleString()} backdrops (theory: 4.58 at Y=0.179)`);
}

/* ---- 2. strength 0 must change nothing -------------------------------------------------- */
{
  let drift = 0;
  for (let v = 0; v < 256; v++) for (const k of Object.keys(W.M)) {
    const c = [v, (v * 7) % 256, (v * 13) % 256], m0 = W.blend(W.M[k], 0);
    for (const f of [W.correctGraphic, W.correctKeepLum]) {
      const o = f(c, m0);
      drift = Math.max(drift, Math.abs(o[0] - c[0]), Math.abs(o[1] - c[1]), Math.abs(o[2] - c[2]));
    }
  }
  gate("strength 0 is an exact no-op", drift === 0, `max channel drift ${drift}/255`);
}

/* ---- 3. neutrals stay neutral ----------------------------------------------------------- */
// A correction that tinted the grays would recolor page chrome that carries no color meaning.
{
  let cast = 0;
  for (let v = 0; v < 256; v++) for (const k of Object.keys(W.M)) for (const f of [W.correctGraphic, W.correctKeepLum]) {
    const o = f([v, v, v], W.M[k]);
    cast = Math.max(cast, Math.max(o[0], o[1], o[2]) - Math.min(o[0], o[1], o[2]));
  }
  gate("grays stay neutral", cast <= 2, `max channel spread ${cast}/255`);
}

/* ---- 4. the bitmap fallback preserves the author's own contrast ------------------------- */
// Where text sits on a url() bitmap the ratio cannot be proven, so the widget preserves
// luminance instead of guessing. That path must leave the ratio as the author set it.
{
  const PAIRS = [
    [[158, 42, 13], [240, 237, 230]], [[194, 52, 16], [255, 255, 255]], [[20, 20, 20], [248, 246, 242]],
    [[107, 107, 107], [248, 246, 242]], [[255, 255, 255], [194, 52, 16]], [[241, 146, 122], [20, 20, 20]],
    [[0, 114, 178], [248, 246, 242]], [[63, 120, 54], [255, 255, 255]], [[141, 134, 124], [20, 20, 20]],
  ];
  let drift = 0, broke = 0;
  for (const [fg, bg] of PAIRS) for (const k of Object.keys(W.M)) for (const st of [0, 25, 50, 75, 100]) {
    const m = W.blend(W.M[k], st / 100);
    const before = cvd.contrastRatio(hex(fg), hex(bg));
    const after = cvd.contrastRatio(hex(W.correctKeepLum(fg, m)), hex(W.correctKeepLum(bg, m)));
    drift = Math.max(drift, Math.abs(after - before));
    if (before >= 4.5 && after < 4.5) broke++;
  }
  gate("bitmap fallback preserves contrast", drift < 0.1 && broke === 0,
    `max drift ${drift.toFixed(4)}:1 across 180 checks, AA pairs broken ${broke}`);
}

/* ---- 5. the correction still does its job ----------------------------------------------- */
// A pair only counts as a genuine confusion if the deficient eye cannot separate it (simulated
// deltaE < 3) while normal vision can (true deltaE > 15). Scoring "red vs green" instead would
// flatter the result, because most such pairs differ in lightness, which dichromats see fine.
{
  const GRID = [];
  for (let r = 0; r <= 255; r += 51) for (let g = 0; g <= 255; g += 51) for (let b = 0; b <= 255; b += 51) GRID.push([r, g, b]);
  const simDE = (a, b, t) => cvd.deltaE(cvd.simulate(hex(a), t), cvd.simulate(hex(b), t));
  const rows = [];
  let allPass = true;
  for (const t of cvd.TYPES) {
    const conf = [];
    for (let i = 0; i < GRID.length; i++) for (let j = i + 1; j < GRID.length; j++) {
      const sd = simDE(GRID[i], GRID[j], t);
      if (sd < 3 && cvd.deltaE(hex(GRID[i]), hex(GRID[j])) > 15) conf.push([GRID[i], GRID[j], sd]);
    }
    for (const mode of [t, "balanced"]) {
      let improved = 0, before = 0, after = 0;
      for (const [a, b, sd] of conf) {
        const d = simDE(W.correctGraphic(a, W.M[mode]), W.correctGraphic(b, W.M[mode]), t);
        if (d > sd) improved++;
        before += sd; after += d;
      }
      const n = conf.length || 1, pct = (100 * improved) / n;
      rows.push({ mode, type: t, n: conf.length, before: +(before / n).toFixed(2), after: +(after / n).toFixed(2), separated: +pct.toFixed(0) });
      if (pct < 90) allPass = false;
    }
  }
  gate("correction separates >=90% of genuine confusions", allPass,
    rows.map((r) => `${r.mode}/${r.type} ${r.separated}% (dE ${r.before}->${r.after}, n=${r.n})`).join("; "));
}

/* ---- 6. the widget and the published engine must agree ---------------------------------- */
// If these ever diverge, every contrast number the site publishes is suspect. Exact equality
// is the bar — not "close enough" — because both sides implement the same WCAG definition.
{
  let maxLum = 0, maxRatio = 0, n = 0;
  for (let r = 0; r < 256; r += 7) for (let g = 0; g < 256; g += 11) for (let b = 0; b < 256; b += 13) {
    const c = [r, g, b];
    maxLum = Math.max(maxLum, Math.abs(W.lum(c) - cvd.relLuminance(hex(c))));
    maxRatio = Math.max(maxRatio, Math.abs(W.ratio(c, [255, 255, 255]) - cvd.contrastRatio(hex(c), "#ffffff")));
    n++;
  }
  gate("widget maths == opticquiz-cvd", maxLum === 0 && maxRatio === 0,
    `${n.toLocaleString()} colors, max luminance diff ${maxLum}, max ratio diff ${maxRatio}`);
}

/* ---- 7. backdrop resolution ------------------------------------------------------------- */
{
  const bitmap = W.stopsOf('url("/photo.jpg")');
  const grad = W.stopsOf("radial-gradient(1200px 500px at 70% -10%, rgb(35, 50, 74) 0%, rgb(20, 20, 20) 55%)");
  const none = W.stopsOf("none");
  const ext = W.extremes([[128, 128, 128], [0, 0, 0], [255, 255, 255], [60, 60, 60]]);
  gate("a bitmap backdrop is refused, not guessed", bitmap === null);
  gate("gradient stops are recovered", !!grad && grad.length === 2 && grad[0][0] === 35 && grad[1][0] === 20,
    JSON.stringify(grad));
  gate("no background yields no stops", Array.isArray(none) && none.length === 0);
  gate("backdrop list keeps the luminance extremes", ext.length === 2 && W.lum(ext[0]) < W.lum(ext[1]));
}

/* ---- 8. color parsing ------------------------------------------------------------------- */
{
  const ok =
    JSON.stringify(W.parse("rgb(1, 2, 3)")) === "[1,2,3,1]" &&
    JSON.stringify(W.parse("rgb(1 2 3)")) === "[1,2,3,1]" &&          // modern space syntax
    JSON.stringify(W.parse("rgba(1,2,3,0.5)")) === "[1,2,3,0.5]" &&
    W.parse("rgba(0,0,0,0)") === null &&                              // fully transparent
    W.parse("color(srgb 1 0 0)") === null &&                          // out of scope, skipped
    W.parse("") === null;
  gate("color parser handles every computed form we act on", ok);
}

/* ---- 9. the extension offer points somewhere real --------------------------------------- */
// The widget routes a visitor to the store their browser can actually install from. Phones get
// the system filter instead, because Chrome on Android takes no extensions and iOS has none.
{
  const CASES = [
    ["Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", "chromewebstore"],
    ["Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0", "microsoftedge"],
    ["Mozilla/5.0 (Windows NT 10.0; rv:133.0) Gecko/20100101 Firefox/133.0", "addons.mozilla.org"],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36", "#system"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1", "#system"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15", "/extension/"],
  ];
  const src = fs.readFileSync(WIDGET, "utf8");
  let bad = [];
  for (const [ua, expect] of CASES) {
    const harness = src.replace(/if \(document\.readyState === "loading"\)[\s\S]*$/,
      "module.exports = { browserTarget, STORE };\n})();\n");
    const mod = { exports: {} };
    new Function("module", "window", "document", "navigator", harness)(mod, {}, {}, { userAgent: ua });
    const t = mod.exports.browserTarget();
    const dest = t ? t.url : mod.exports.STORE.all;
    if (dest.indexOf(expect) === -1) bad.push(ua.slice(0, 40) + " -> " + dest);
  }
  gate("install offer routes to a store that can serve it", bad.length === 0, bad.join("; "));
}

/* ---- report ----------------------------------------------------------------------------- */
const failed = gates.filter((g) => !g.pass);

if (JSON_OUT) {
  console.log(JSON.stringify({ widget: path.relative(ROOT, WIDGET), engine: "opticquiz-cvd", gates, failed: failed.length }, null, 2));
} else {
  console.log("\n  widget/eye.js — guarantees verified against opticquiz-cvd\n");
  for (const g of gates) {
    console.log("  " + (g.pass ? "PASS  " : "FAIL  ") + g.name);
    if (g.detail) console.log("        " + g.detail);
  }
  console.log("\n  " + (failed.length ? failed.length + " GATE(S) FAILED" : "all " + gates.length + " gates passed") + "\n");
}

process.exit(failed.length ? 1 : 0);
