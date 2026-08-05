/**
 * Build the store-ready zips for Chrome/Edge and Firefox from ONE source tree.
 *
 *   node build.mjs
 *
 * Output:
 *   dist/opticquiz-extension-chrome-<version>.zip     Chrome Web Store + Edge Add-ons
 *   dist/opticquiz-extension-firefox-<version>.zip    Firefox Add-ons (AMO)
 *
 * The two differ by exactly one manifest key. Maintaining two source trees is how they
 * drift, so the Firefox manifest is generated from the Chrome one at build time rather
 * than kept as a second file someone has to remember to update.
 *
 * Why the port is small: the extension uses only chrome.storage.*, which Firefox supports
 * under the same namespace, and has NO background service worker — which is the usual
 * thing that breaks a Manifest V3 extension on Firefox.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = import.meta.dirname;
const DIST = join(ROOT, "dist");
const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
const VERSION = manifest.version;

// Files that belong in a store package. Anything not listed is build scaffolding and
// shipping it would only widen the review surface.
const SHIP = [
  "manifest.json", "content.js", "popup.html", "popup.js",
  "icon16.png", "icon48.png", "icon128.png", "icon.png",
];

function stage(name, transform) {
  const dir = join(DIST, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const f of SHIP) {
    const src = join(ROOT, f);
    if (existsSync(src)) cpSync(src, join(dir, f));
  }
  const m = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
  transform(m);
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(m, null, 2) + "\n");

  const zipName = `opticquiz-extension-${name}-${VERSION}.zip`;
  const zip = join(DIST, zipName);
  rmSync(zip, { force: true });
  // tar ships with Windows 10+ and produces a real zip with -a. Paths are RELATIVE and the
  // cwd is set instead: GNU tar (which Git Bash puts on PATH) reads an absolute Windows
  // path as a remote host:path spec and fails with "Cannot connect to C:".
  execFileSync("tar", ["-a", "-c", "-f", zipName, "-C", name, "."], { cwd: DIST, stdio: "inherit" });
  return zip;
}

const chrome = stage("chrome", () => {});

const firefox = stage("firefox", (m) => {
  // Firefox requires an explicit add-on id; Chrome derives one from the upload.
  m.browser_specific_settings = {
    gecko: {
      id: "colorblind-corrector@opticquiz.com",
      strict_min_version: "115.0",   // first Firefox ESR with usable MV3 support
    },
  };
});

const size = (p) => (readFileSync(p).length / 1024).toFixed(0) + " KB";
console.log(`\n  chrome / edge : ${chrome}  (${size(chrome)})`);
console.log(`  firefox       : ${firefox}  (${size(firefox)})`);
console.log(`\n  version ${VERSION}\n`);
