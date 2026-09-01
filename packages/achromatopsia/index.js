// achromatopsia — simulate total color blindness (achromatopsia / complete monochromacy).
//
// A complete achromat has no functioning color channels: the world is luminance only. simulate()
// replaces a color with the gray of the same WCAG relative luminance (opticquiz-cvd's relLuminance),
// re-encoded to sRGB; simulateImage() does the same per pixel. This is the total-monochromacy end of
// the spectrum — distinct from the dichromacies (see `dichromacy`) and anomalous trichromacy.
//
//   const achromatopsia = require("achromatopsia");
//   achromatopsia.simulate("#d7191c");            // "#7f7f7f" — a mid-gray of the same luminance
//   const png = achromatopsia.simulateImage("chart.png");
//   require("fs").writeFileSync("chart-gray.png", png);

const cvd = require("opticquiz-cvd");
const { grayImage, grayValue } = require("./imageGray.js");

function linToSrgb(y) { return y <= 0.0031308 ? 12.92 * y : 1.055 * Math.pow(y, 1 / 2.4) - 0.055; }

// A color as an achromat sees it: the equiluminant gray, as a hex string.
function simulate(color) {
  const y = cvd.relLuminance(color);
  const v = Math.round(Math.max(0, Math.min(1, linToSrgb(y))) * 255);
  const h = ("0" + v.toString(16)).slice(-2);
  return "#" + h + h + h;
}

module.exports = {
  simulate, // (color) -> gray hex
  simulateImage: grayImage, // (pathOrBufferOrDataUri, opts?) -> PNG Buffer
  grayValue // (r,g,b) -> 0..255, for callers that already have channels
};
