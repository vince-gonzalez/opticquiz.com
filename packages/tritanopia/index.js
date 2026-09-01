// tritanopia — simulate tritanopia (blue-yellow) color vision.
// A one-type shortcut over cvdsim: everything here is cvdsim's simulate / simulateImage with the
// deficiency fixed to "tritan". No colorimetry is reimplemented here.
//
//   const tritanopia = require("tritanopia");
//   tritanopia.simulate("#d7191c");            // that color as tritanopia sees it
//   const png = tritanopia.simulateImage("chart.png");   // a PNG Buffer, recolored
const cvdsim = require("cvdsim");
const TYPE = "tritan";
module.exports = {
  simulate: (color, severity) => cvdsim.simulate(color, TYPE, severity),
  simulateImage: (input, opts) => cvdsim.simulateImage(input, TYPE, opts),
  type: TYPE
};
