// ============================================================
// OQ-CALIB  v1.0.0 — OpticQuiz screen calibration layer
// opticquiz.com
// ============================================================
//
// The start of a shared calibration layer. The single biggest
// validity problem in any browser vision test is that you're
// measuring eye x display, not the eye alone. This module holds
// the reusable math for turning an uncalibrated screen into a
// ruler: physical size from a standard card, and correct visual
// angles from that plus a viewing distance.
//
// Currently powers the acuity test; contrast and color plate
// sizing are the next consumers.
//
// KEY FACT: a credit / debit / ID card (ISO/IEC 7810 ID-1) is
// 85.6 mm wide everywhere on Earth — the calibration ruler.
//
// USAGE:
//   var pxmm = OQ.Calib.pxPerMm(boxWidthPx);          // card box -> px/mm
//   var px   = OQ.Calib.optotypePx(logmar, distCm, pxmm);  // true-size letter
//   var deg  = OQ.Calib.pxToDeg(offsetPx, distCm, pxmm);   // px -> visual angle
//
// NO DEPENDENCIES. var-only. Attaches to window.OQ.
// ============================================================

var OQ = window.OQ || {};

(function () {

  var Calib = {};

  // Standard payment/ID card width (ISO/IEC 7810 ID-1), in mm.
  Calib.CARD_MM = 85.6;

  // Screen scale from a card-matched box: pixels per millimetre.
  Calib.pxPerMm = function (boxWidthPx) {
    return boxWidthPx / Calib.CARD_MM;
  };

  // Convert an angular size (arc-minutes) to on-screen pixels,
  // given viewing distance (cm) and screen scale (px/mm).
  Calib.arcminToPx = function (arcmin, distCm, pxPerMm) {
    var rad = (arcmin / 60) * (Math.PI / 180);
    var mm = 2 * (distCm * 10) * Math.tan(rad / 2);
    return mm * pxPerMm;
  };

  // Size (px) of a Snellen/logMAR optotype. A 20/20 optotype
  // subtends 5 arc-minutes overall; size scales by 10^logMAR.
  Calib.optotypePx = function (logmar, distCm, pxPerMm) {
    return Calib.arcminToPx(5 * Math.pow(10, logmar), distCm, pxPerMm);
  };

  // Inverse: the visual angle (degrees) a pixel extent subtends
  // at a viewing distance, given screen scale.
  Calib.pxToDeg = function (px, distCm, pxPerMm) {
    var cm = (px / pxPerMm) / 10;               // px -> mm -> cm
    return Math.atan2(cm, distCm) * 180 / Math.PI;
  };

  Calib.pxToArcmin = function (px, distCm, pxPerMm) {
    return Calib.pxToDeg(px, distCm, pxPerMm) * 60;
  };

  Calib.pxToArcsec = function (px, distCm, pxPerMm) {
    return Calib.pxToDeg(px, distCm, pxPerMm) * 3600;
  };

  // Suggested gray-ramp values (0-255) for a future gamma sanity
  // check: a page can render these patches and ask the user which
  // are distinguishable, hinting at their display's brightness/gamma.
  // Exposed now so the calibration layer has one honest place to grow.
  Calib.grayRamp = function () {
    return [8, 16, 24, 32, 48, 64, 96, 128, 160, 192, 224, 247];
  };

  OQ.Calib = Calib;
  OQ.VERSION_CALIB = '1.0.0';

})();

window.OQ = OQ;
