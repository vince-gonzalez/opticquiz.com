// trichromacy — normal (three-cone) color vision, plus anomalous trichromacy.
//
// A normal trichromat sees true color, so simulate() is the identity (the engine at severity 0).
// The useful part is anomalous(): anomalous trichromacy — protanomaly / deuteranomaly /
// tritanomaly — is a milder, shifted deficiency, modeled as a partial simulation (severity < 1).
// For the full dichromacies see `dichromacy`; for total monochromacy see `achromatopsia`.
//
//   const trichromacy = require("trichromacy");
//   trichromacy.simulate("#d7191c");                 // "#d7191c" — true color
//   trichromacy.anomalous("#d7191c", "deutan", 0.5); // mild deuteranomaly
//   const png = trichromacy.anomalousImage("chart.png", "deutan", { severity: 0.5 });

const cvdsim = require("cvdsim");
const TYPES = cvdsim.TYPES;

function assertType(type) {
  if (!TYPES.includes(type)) throw new Error('type must be "protan", "deutan", or "tritan".');
}

// Normal trichromatic vision: the color unchanged (normalized through the engine).
function simulate(color) {
  return cvdsim.simulate(color, "deutan", 0);
}

// Anomalous trichromacy — a partial deficiency. severity 0..1, default 0.5 (mild).
function anomalous(color, type, severity) {
  assertType(type);
  return cvdsim.simulate(color, type, severity == null ? 0.5 : severity);
}
function anomalousImage(input, type, opts) {
  assertType(type);
  const o = Object.assign({ severity: 0.5 }, opts || {});
  return cvdsim.simulateImage(input, type, o);
}

module.exports = { simulate, anomalous, anomalousImage, TYPES };
