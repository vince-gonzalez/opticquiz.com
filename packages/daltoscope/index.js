// daltoscope — see a color, a palette, or a whole image as a colorblind person does.
//
// Named for daltonism (color blindness, after John Dalton). Where `hueristic` judges whether
// colors are safe, daltoscope shows you what they look like through a color-vision deficiency —
// a single color, or an entire image recolored. The per-color transform is opticquiz-cvd's
// simulate() (Machado, Oliveira & Fernandes 2009); nothing about the simulation is reinvented.
//
//   const dalton = require("daltoscope");
//   dalton.simulate("#d7191c", "deutan");        // "#8a7b0c" — that red, to a deuteranope
//   dalton.simulateAll("#d7191c");               // { protan, deutan, tritan }
//   const png = dalton.simulateImage("chart.png", "deutan");   // a PNG Buffer of the recolored image
//   require("fs").writeFileSync("chart-deutan.png", png);

const cvd = require("opticquiz-cvd");
const { simulateImage } = require("./imageSim.js");

// A single color under all three deficiencies at once, for side-by-side comparison.
function simulateAll(color, severity) {
  const out = {};
  for (const t of cvd.TYPES) out[t] = cvd.simulate(color, t, severity);
  return out;
}

module.exports = {
  simulate: cvd.simulate, // (color, type, severity?, model?) -> hex
  simulateAll, // (color, severity?) -> { protan, deutan, tritan }
  simulateImage, // (pathOrBufferOrDataUri, type, opts?) -> PNG Buffer
  TYPES: cvd.TYPES
};
