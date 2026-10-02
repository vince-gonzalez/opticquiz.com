#!/usr/bin/env node
/* build-widgets.js — generate every DOM correction surface from one engine.
 *
 *   node tools/build-widgets.js           # write the three artifacts
 *   node tools/build-widgets.js --check   # fail if any artifact is out of date (for CI)
 *
 * WHY
 * The site widget, the npm package and the browser extension were three hand-maintained copies
 * of the same algorithm. That is how one defect — a whole-page filter that moved lightness and
 * silently degraded text contrast — came to ship three separate times. Now widget/engine.js is
 * the only place the correction exists, each surface supplies only its own shell, and this
 * script staples them together. Drift stops being possible rather than being something anyone
 * has to remember.
 *
 * The output is deliberately a single plain file per target with no runtime dependency: the
 * site widget is served as a one-liner to strangers' pages, and an extension content script
 * cannot import. So the engine is inlined, not required.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ENGINE = path.join(ROOT, "widget", "engine.js");
const SHELLS = path.join(ROOT, "widget", "shells");
const CHECK = process.argv.includes("--check");

const TARGETS = [
  { shell: "site.js",      out: path.join(ROOT, "widget", "eye.js") },
  { shell: "npm.js",       out: path.join(ROOT, "packages", "cvd-eye", "index.js") },
  { shell: "extension.js", out: path.join(ROOT, "browser-extension", "content.js") },
];

// The engine ends with a CommonJS export so tools/verify-widget.js can require() it directly.
// Browser bundles do not need it and it only invites confusion there, so strip it on the way in.
function engineSource() {
  return fs.readFileSync(ENGINE, "utf8")
    .replace(/\nif \(typeof module !== "undefined" && module\.exports\) module\.exports = OQ_ENGINE;\s*$/, "\n")
    .trimEnd();
}

// A shell opens with its own banner comment; that becomes the artifact's banner, and the rest
// becomes the body inside the IIFE.
function splitShell(src) {
  const m = /^\s*\/\*![\s\S]*?\*\/\n/.exec(src);
  if (!m) throw new Error("shell has no leading /*! banner */");
  return { banner: m[0].trimEnd(), body: src.slice(m[0].length).replace(/\s+$/, "") };
}

function build(shellName) {
  const { banner, body } = splitShell(fs.readFileSync(path.join(SHELLS, shellName), "utf8"));
  return [
    banner,
    "/* GENERATED FILE — built from widget/engine.js + widget/shells/" + shellName + ".",
    "   Do not edit here; edit the engine or the shell and run: node tools/build-widgets.js */",
    "(function () {",
    '  "use strict";',
    "",
    engineSource().split("\n").map((l) => (l ? "  " + l : l)).join("\n"),
    "",
    body,
    "})();",
    "",
  ].join("\n");
}

let stale = 0, wrote = 0;
for (const t of TARGETS) {
  const next = build(t.shell);
  const rel = path.relative(ROOT, t.out).replace(/\\/g, "/");
  const prev = fs.existsSync(t.out) ? fs.readFileSync(t.out, "utf8") : null;
  if (prev === next) {
    console.log("  up to date  " + rel);
    continue;
  }
  if (CHECK) {
    console.log("  STALE       " + rel + "  (run: node tools/build-widgets.js)");
    stale++;
    continue;
  }
  fs.writeFileSync(t.out, next);
  const kb = (Buffer.byteLength(next, "utf8") / 1024).toFixed(1);
  console.log("  wrote       " + rel + "  (" + kb + " KB)");
  wrote++;
}

if (CHECK && stale) {
  console.log("\n  " + stale + " artifact(s) out of date\n");
  process.exit(1);
}
console.log("\n  " + (CHECK ? "all artifacts current" : wrote + " written, " + (TARGETS.length - wrote) + " unchanged") + "\n");
