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
import { deflateRawSync } from "node:zlib";
import { join } from "node:path";

/* ---------------------------------------------------------------------------------------
 * A real ZIP writer, in-process, no external tool.
 *
 * This replaces `tar -a -c -f out.zip`, which produced a TAR ARCHIVE NAMED .ZIP and got the
 * package rejected by Firefox as "invalid or corrupt". Two things went wrong and the second
 * is the one worth remembering:
 *
 *   1. Git Bash puts GNU tar ahead of Windows' bsdtar on PATH. bsdtar's -a understands zip;
 *      GNU tar's -a is --auto-compress, which only knows gz/bz2/xz/zst. Handed a .zip name
 *      it writes a plain tar and exits 0. No error, no warning.
 *   2. The build then VERIFIED the output with `tar -tf`, which reads a tar perfectly well.
 *      So the check reported "7 files at the root" for a file that had never been a zip. A
 *      verifier built on the same tool as the writer cannot see the writer's mistakes.
 *
 * Hence: write the bytes here, and verify with a different implementation entirely
 * (see the assertions at the end of stage()). Timestamps are fixed so builds are
 * byte-reproducible rather than varying with the clock.
 * ------------------------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

// Fixed DOS date/time: 2026-01-01 00:00:00. Reproducible output beats a meaningful mtime.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

/** entries: [{ name, data }] with POSIX names, no leading "./" and no directory entries. */
function makeZip(entries) {
  const locals = [], central = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const deflated = deflateRawSync(data, { level: 9 });
    // Store rather than deflate when deflating would grow the file (tiny PNGs do this).
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(data);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);      // local file header signature
    lh.writeUInt16LE(20, 4);              // version needed
    lh.writeUInt16LE(0, 6);               // flags
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(DOS_TIME, 10);
    lh.writeUInt16LE(DOS_DATE, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);              // extra field length
    locals.push(lh, nameBuf, body);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);      // central directory signature
    cd.writeUInt16LE(20, 4);              // version made by
    cd.writeUInt16LE(20, 6);              // version needed
    cd.writeUInt16LE(0, 8);               // flags
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(DOS_TIME, 12);
    cd.writeUInt16LE(DOS_DATE, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);              // extra
    cd.writeUInt16LE(0, 32);              // comment
    cd.writeUInt16LE(0, 34);              // disk number start
    cd.writeUInt16LE(0, 36);              // internal attributes
    // >>> 0 because JS bitwise operators are signed 32-bit: 0o100644 << 16 is negative.
    cd.writeUInt32LE((0o100644 << 16) >>> 0, 38); // external attrs: regular file, rw-r--r--
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += lh.length + nameBuf.length + body.length;
  }

  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);      // end of central directory
  eocd.writeUInt16LE(0, 4);               // this disk
  eocd.writeUInt16LE(0, 6);               // disk with central directory
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);              // comment length
  return Buffer.concat([...locals, cdBuf, eocd]);
}

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

  // Entry names are exactly what a store expects at the archive root: "manifest.json", not
  // "./manifest.json". The old tar invocation produced the "./" form as well as the wrong
  // container format.
  const entries = SHIP.filter((f) => existsSync(join(dir, f)))
    .map((f) => ({ name: f, data: readFileSync(join(dir, f)) }));
  writeFileSync(zip, makeZip(entries));

  // Refuse to emit a package that isn't one. These assertions are the whole point: the
  // previous build shipped a tar named .zip because nothing checked the container format.
  const bytes = readFileSync(zip);
  if (bytes.readUInt32LE(0) !== 0x04034b50) {
    throw new Error(`${zipName} is not a ZIP - first bytes are ${bytes.subarray(0, 4).toString("hex")}`);
  }
  if (bytes.readUInt32LE(bytes.length - 22) !== 0x06054b50) {
    throw new Error(`${zipName} has no end-of-central-directory record`);
  }
  if (!entries.some((e) => e.name === "manifest.json")) {
    throw new Error(`${zipName} has no manifest.json at the archive root`);
  }
  return zip;
}

const chrome = stage("chrome", () => {});

const firefox = stage("firefox", (m) => {
  // Firefox requires an explicit add-on id; Chrome derives one from the upload.
  m.browser_specific_settings = {
    gecko: {
      id: "colorblind-corrector@opticquiz.com",
      // 140, not 115. The instinct for an accessibility tool is to support the oldest
      // browser possible, but ESR 115 reached end of life in March 2026 - a floor there
      // buys users on an unpatched browser, not reach. ESR 140 is current and supported,
      // and 140 is also the release that introduced data_collection_permissions below, so
      // declaring anything lower makes that key silently inert.
      strict_min_version: "140.0",
      // Required for all new Firefox extensions since 3 November 2025. ["none"] is the
      // literal value meaning the extension collects and transmits nothing - which is true
      // here: no network requests at all, and chrome.storage.local holds only the user's
      // own strength setting. Firefox shows this at install time, so the claim is made
      // where a user can see it rather than only in a store description.
      data_collection_permissions: { required: ["none"] },
    },
    // Android got the same key one release later, so it needs its own floor.
    gecko_android: { strict_min_version: "142.0" },
  };
});

const size = (p) => (readFileSync(p).length / 1024).toFixed(0) + " KB";
console.log(`\n  chrome / edge : ${chrome}  (${size(chrome)})`);
console.log(`  firefox       : ${firefox}  (${size(firefox)})`);
console.log(`\n  version ${VERSION}\n`);

/* Source package for AMO review.
 *
 *     node build.mjs --source
 *
 * AMO asks whether any tool "generates code or file(s) to include in the extension". This
 * build does: the Firefox manifest.json is derived from the Chrome one at build time rather
 * than kept as a second file. Nothing is minified or bundled and every .js and .html file
 * ships byte-identical to source - but the honest answer to their question is still yes, and
 * an undisclosed build step found later is far worse than an extra upload.
 *
 * Contains exactly what a reviewer needs to reproduce dist/: the source files, the build
 * script, and instructions. Not the wider website repository.
 */
if (process.argv.includes("--source")) {
  const SRC = ["manifest.json", "content.js", "popup.html", "popup.js",
               "icon16.png", "icon48.png", "icon128.png", "build.mjs", "README.md"];
  const instructions = [
    "OpticQuiz - Colorblind Corrector: reproducing the reviewed package",
    "",
    "Requirements: Node.js 18 or later. No dependencies, no network access needed.",
    "",
    "  node build.mjs",
    "",
    "That writes dist/opticquiz-extension-firefox-<version>.zip, which is the package under",
    "review, and dist/opticquiz-extension-chrome-<version>.zip for the Chromium stores.",
    "",
    "What the build actually does:",
    "  1. Copies the source files listed in SHIP, unmodified.",
    "  2. Derives the Firefox manifest from manifest.json by adding exactly one key,",
    "     browser_specific_settings (gecko id, strict_min_version, data_collection_permissions,",
    "     and gecko_android). Nothing else differs between the two packages.",
    "  3. Writes the ZIP in-process with node:zlib.",
    "",
    "No minifier, no bundler, no transpiler, no template engine. content.js, popup.js and",
    "popup.html in the reviewed package are byte-identical to the copies in this archive; you",
    "can confirm that with any checksum tool.",
    "",
    "Public repository: https://github.com/zengineco/opticquiz.com/tree/main/browser-extension",
    "Licence: MIT",
    "",
  ].join("\n");

  const entries = SRC.filter((f) => existsSync(join(ROOT, f)))
    .map((f) => ({ name: f, data: readFileSync(join(ROOT, f)) }));
  entries.unshift({ name: "BUILD-INSTRUCTIONS.txt", data: Buffer.from(instructions, "utf8") });

  const out = join(DIST, `opticquiz-extension-source-${VERSION}.zip`);
  rmSync(out, { force: true });
  writeFileSync(out, makeZip(entries));
  const b = readFileSync(out);
  if (b.readUInt32LE(0) !== 0x04034b50) throw new Error("source zip is not a ZIP");
  console.log(`  source        : ${out}  (${(b.length / 1024).toFixed(0)} KB, ${entries.length} files)`);
}

/* Run Mozilla's own validator - the same addons-linter that AMO runs server-side.
 *
 *     node build.mjs --lint
 *
 * Opt-in because it downloads a package, so the default build stays offline-safe. Worth
 * running before every submission: the in-process assertions above prove the file is a
 * well-formed ZIP with a manifest at its root, but only addons-linter knows things like
 * "data_collection_permissions has been mandatory for new extensions since November 2025"
 * or "that key does nothing below Firefox 140". Neither of those is discoverable from the
 * bytes, and both would have come back as a rejection.
 */
if (process.argv.includes("--lint")) {
  const { execFileSync } = await import("node:child_process");
  console.log("  running addons-linter (Mozilla's own validator)...\n");
  try {
    execFileSync("npx", ["--yes", "addons-linter@latest", firefox],
      { stdio: "inherit", shell: process.platform === "win32" });
  } catch {
    console.error("\n  addons-linter reported problems, or could not be fetched. " +
                  "A non-zero exit here means DO NOT SUBMIT.\n");
    process.exitCode = 1;
  }
}
