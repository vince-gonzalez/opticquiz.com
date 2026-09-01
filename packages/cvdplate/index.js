// cvdplate — generate Ishihara-style pseudoisochromatic color-vision test plates.
//
//   const cvdplate = require("cvdplate");
//   const png = cvdplate.plate("7", { type: "deutan", size: 480, seed: 42 });
//   require("fs").writeFileSync("plate-7.png", png);   // a digit that vanishes for deuteranopes
//
// A JS companion to the `ishihara` Python package. The color pair is chosen with the published
// OpticQuiz engine (deltaE + simulate) so the figure is measurably distinct to normal vision and
// measurably collapsed under the target deficiency.
module.exports = require("./plate.js");
