// deutan — simulate deuteranopia (green-blind) color vision.
// A one-type shortcut over cvdsim: everything here is cvdsim's simulate / simulateImage with the
// deficiency fixed to "deutan". No colorimetry is reimplemented here.
//
//   const deutan = require("deutan");
//   deutan.simulate("#d7191c");            // that color as deuteranopia sees it
//   const png = deutan.simulateImage("chart.png");   // a PNG Buffer, recolored
const cvdsim = require("cvdsim");
const TYPE = "deutan";
module.exports = {
  simulate: (color, severity) => cvdsim.simulate(color, TYPE, severity),
  simulateImage: (input, opts) => cvdsim.simulateImage(input, TYPE, opts),
  type: TYPE
};
