// safepalette — generate, check, and fix colorblind-safe color palettes.
//
// Two of these are opticquiz-cvd's own (check = checkPalette, fix = fixPalette); the new piece is
// generate(), which hands back a palette that is colorblind-safe by construction. It starts from
// the Okabe & Ito qualitative palette (Wong, "Points of view: Color blindness", Nature Methods
// 2011) — eight colors chosen to stay distinct under protan/deutan/tritan — and, when you ask for
// more than eight, extends it only with lightness-shifted colors that keep the whole set passing
// checkPalette. No colorimetry is reimplemented; the safety test is the published engine's.
//
//   const sp = require("safepalette");
//   sp.generate(5);                       // 5 colorblind-safe hex colors
//   sp.isSafe(["#d7191c", "#1a9641"]);    // false
//   sp.fix(["#d7191c", "#1a9641"]).colors // a safe palette near the originals

const cvd = require("opticquiz-cvd");

// Okabe–Ito colorblind-safe qualitative palette (8 colors, incl. black).
const OKABE_ITO = ["#000000", "#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"];

function check(colors, opts) {
  return cvd.checkPalette(colors, opts);
}
function isSafe(colors, opts) {
  return cvd.checkPalette(colors, opts).pass;
}
function fix(colors, opts) {
  return cvd.fixPalette(colors, opts);
}

function shiftLightness(hex, dL) {
  const lab = cvd.hexToLab(hex); // [L, a, b]
  return cvd.labToHex(Math.max(0, Math.min(100, lab[0] + dL)), lab[1], lab[2]);
}
const HEX6 = /^#[0-9a-fA-F]{6}$/;

/**
 * Return up to `n` colorblind-safe hex colors.
 * n <= 8 is the Okabe–Ito palette. For n > 8 the palette is extended with lightness-shifted
 * variants that keep the whole set passing checkPalette; because mutually-distinct-under-CVD
 * colors are finite, the result may contain fewer than n colors for large n (it never returns
 * an unsafe one). Pass opts through to checkPalette (e.g. { minDelta }).
 */
function generate(n, opts) {
  n = n | 0;
  if (n < 1) return [];
  if (n <= OKABE_ITO.length) return OKABE_ITO.slice(0, n);

  const out = OKABE_ITO.slice();
  const candidates = [];
  for (const hex of OKABE_ITO) {
    for (const dL of [18, -18, 30, -30, 10, -10]) candidates.push(shiftLightness(hex, dL));
  }
  for (const c of candidates) {
    if (out.length >= n) break;
    if (HEX6.test(c) && !out.includes(c) && cvd.checkPalette(out.concat([c]), opts).pass) out.push(c);
  }
  return out;
}

module.exports = { generate, isSafe, fix, check, OKABE_ITO };
