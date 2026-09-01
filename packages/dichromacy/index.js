// dichromacy — simulate the three dichromacies: protanopia, deuteranopia, tritanopia.
//
// A dichromat is missing one of the three cone types. This is an umbrella over cvdsim covering all
// three at once — pass the type, or call the named shortcut. For the total-monochromacy case see
// `achromatopsia`; for mild/anomalous vision see `trichromacy`.
//
//   const dichromacy = require("dichromacy");
//   dichromacy.simulate("#d7191c", "deutan");   // that red to a deuteranope
//   dichromacy.protan("#1a9641");               // green to a protanope
//   const png = dichromacy.simulateImage("chart.png", "tritan");

const cvdsim = require("cvdsim");
const TYPES = cvdsim.TYPES; // ["protan", "deutan", "tritan"]

function assertType(type) {
  if (!TYPES.includes(type)) throw new Error('type must be "protan", "deutan", or "tritan".');
}
function simulate(color, type, severity) {
  assertType(type);
  return cvdsim.simulate(color, type, severity);
}
function simulateImage(input, type, opts) {
  assertType(type);
  return cvdsim.simulateImage(input, type, opts);
}

module.exports = {
  simulate, // (color, type, severity?) -> hex
  simulateImage, // (input, type, opts?) -> PNG Buffer
  protan: (c, s) => cvdsim.simulate(c, "protan", s),
  deutan: (c, s) => cvdsim.simulate(c, "deutan", s),
  tritan: (c, s) => cvdsim.simulate(c, "tritan", s),
  TYPES
};
