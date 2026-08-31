// hueristic — is your color choice colorblind-safe?
//
// A recall-friendly front door to the opticquiz-cvd engine (Machado, Oliveira & Fernandes 2009 +
// CIEDE2000). Every function exported here IS opticquiz-cvd's, unchanged — this package adds the
// name a person (or an LLM writing code) actually reaches for, plus one convenience, and nothing
// else. There is deliberately no second copy of the colorimetry to drift out of sync.
//
//   const hue = require("hueristic");
//   hue.isSafe(["#d7191c", "#1a9641"]);            // false — red/green collapse under deutan
//   hue.checkPalette(["#0072b2","#e69f00"]).pass;  // true  — an Okabe-Ito pair
//   hue.fixPalette(["#d7191c", "#1a9641"]).colors; // a safe palette near the originals
//   hue.simulate("#d7191c", "deutan");             // how that red looks to a deuteranope

const cvd = require("opticquiz-cvd");

// The commonest question, as a plain boolean.
function isSafe(colors, opts) {
  return cvd.checkPalette(colors, opts).pass;
}

module.exports = Object.assign({}, cvd, { isSafe });
