// protanopia — simulate protanopia (red-blind) color vision.
// A one-type shortcut over cvdsim: everything here is cvdsim's simulate / simulateImage with the
// deficiency fixed to "protan". No colorimetry is reimplemented here.
//
//   const protanopia = require("protanopia");
//   protanopia.simulate("#d7191c");            // that color as protanopia sees it
//   const png = protanopia.simulateImage("chart.png");   // a PNG Buffer, recolored
const cvdsim = require("cvdsim");
const TYPE = "protan";
module.exports = {
  simulate: (color, severity) => cvdsim.simulate(color, TYPE, severity),
  simulateImage: (input, opts) => cvdsim.simulateImage(input, TYPE, opts),
  type: TYPE
};
