/*!
 * opticquiz-cvd — colorblind-safe palette checking.
 * Simulates protan/deutan/tritan color-vision deficiency (Machado et al. 2009,
 * severity-1 matrices in linear RGB) and scores perceptual difference with
 * CIEDE2000, flagging palette pairs whose distinction collapses under simulation.
 *
 * Method traces to the published OpticQuiz paper — https://doi.org/10.5281/zenodo.21310578
 * Honest by construction: this simulates a MODEL of color vision, not a guarantee
 * about any individual, and is NOT a legal accessibility (ADA/WCAG) audit.
 * MIT licensed.
 */
"use strict";

var M = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
};
var TYPES = ["protan", "deutan", "tritan"];

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function hexToRgb(h) {
  h = String(h).trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r) {
  return "#" + r.map(function (v) { v = Math.round(clamp01(v / 255) * 255); return (v < 16 ? "0" : "") + v.toString(16); }).join("");
}
function sToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function linToS(c) { c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return clamp01(c) * 255; }

function simulate(hex, type) {
  if (type === "normal" || !M[type]) return String(hex).trim().toLowerCase();
  var rgb = hexToRgb(hex), lin = [sToLin(rgb[0]), sToLin(rgb[1]), sToLin(rgb[2])], m = M[type], o = [0, 0, 0];
  for (var i = 0; i < 3; i++) o[i] = clamp01(m[i][0] * lin[0] + m[i][1] * lin[1] + m[i][2] * lin[2]);
  return rgbToHex([linToS(o[0]), linToS(o[1]), linToS(o[2])]);
}

function rgbToXyz(rgb) {
  var r = sToLin(rgb[0]), g = sToLin(rgb[1]), b = sToLin(rgb[2]);
  return [(0.4124 * r + 0.3576 * g + 0.1805 * b) * 100, (0.2126 * r + 0.7152 * g + 0.0722 * b) * 100, (0.0193 * r + 0.1192 * g + 0.9505 * b) * 100];
}
function xyzToLab(xyz) {
  function f(t) { return t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t + 16 / 116); }
  var fx = f(xyz[0] / 95.047), fy = f(xyz[1] / 100), fz = f(xyz[2] / 108.883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function hexToLab(hex) { return xyzToLab(rgbToXyz(hexToRgb(hex))); }

function ciede2000(lab1, lab2) {
  var L1 = lab1[0], a1 = lab1[1], b1 = lab1[2], L2 = lab2[0], a2 = lab2[1], b2 = lab2[2];
  var avgLp = (L1 + L2) / 2;
  var C1 = Math.sqrt(a1 * a1 + b1 * b1), C2 = Math.sqrt(a2 * a2 + b2 * b2), avgC = (C1 + C2) / 2;
  var G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  var a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  var C1p = Math.sqrt(a1p * a1p + b1 * b1), C2p = Math.sqrt(a2p * a2p + b2 * b2), avgCp = (C1p + C2p) / 2;
  function hp(ap, bp) { if (ap === 0 && bp === 0) return 0; var h = Math.atan2(bp, ap) * 180 / Math.PI; return h < 0 ? h + 360 : h; }
  var h1p = hp(a1p, b1), h2p = hp(a2p, b2);
  var dLp = L2 - L1, dCp = C2p - C1p, dhp;
  if (C1p * C2p === 0) dhp = 0; else { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  var dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);
  var avghp;
  if (C1p * C2p === 0) avghp = h1p + h2p; else { if (Math.abs(h1p - h2p) > 180) avghp = (h1p + h2p + 360) / 2; else avghp = (h1p + h2p) / 2; }
  var T = 1 - 0.17 * Math.cos((avghp - 30) * Math.PI / 180) + 0.24 * Math.cos((2 * avghp) * Math.PI / 180)
    + 0.32 * Math.cos((3 * avghp + 6) * Math.PI / 180) - 0.20 * Math.cos((4 * avghp - 63) * Math.PI / 180);
  var dTheta = 30 * Math.exp(-Math.pow((avghp - 275) / 25, 2));
  var Rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  var Sl = 1 + (0.015 * Math.pow(avgLp - 50, 2)) / Math.sqrt(20 + Math.pow(avgLp - 50, 2));
  var Sc = 1 + 0.045 * avgCp, Sh = 1 + 0.015 * avgCp * T, Rt = -Math.sin(2 * dTheta * Math.PI / 180) * Rc;
  return Math.sqrt(Math.pow(dLp / Sl, 2) + Math.pow(dCp / Sc, 2) + Math.pow(dHp / Sh, 2) + Rt * (dCp / Sc) * (dHp / Sh));
}
function deltaE(hex1, hex2) { return ciede2000(hexToLab(hex1), hexToLab(hex2)); }

// WCAG 2.x relative luminance and contrast — the OTHER axis of color accessibility:
// legibility of text/UI against its background, independent of color-vision type.
function relLuminance(hex) {
  var rgb = hexToRgb(hex);
  return 0.2126 * sToLin(rgb[0]) + 0.7152 * sToLin(rgb[1]) + 0.0722 * sToLin(rgb[2]);
}
function contrastRatio(hex1, hex2) {
  var l1 = relLuminance(hex1), l2 = relLuminance(hex2);
  var hi = l1 > l2 ? l1 : l2, lo = l1 > l2 ? l2 : l1;
  return (hi + 0.05) / (lo + 0.05);
}
// fg vs bg → WCAG pass/fail. `large` = text >=18pt (or 14pt bold). `ui` = the 3:1
// bar for UI components/graphics (WCAG 1.4.11). Reports the ratio, not just a verdict.
function checkContrast(fg, bg, opts) {
  opts = opts || {};
  var large = !!opts.large, r = contrastRatio(fg, bg);
  return {
    ratio: +r.toFixed(2), large: large,
    AA: r >= (large ? 3 : 4.5), AAA: r >= (large ? 4.5 : 7),
    ui: r >= 3, pass: r >= (large ? 3 : 4.5)
  };
}

function checkPalette(hexes, opts) {
  opts = opts || {};
  var distinct = opts.distinct != null ? opts.distinct : 13;
  var collapse = opts.collapse != null ? opts.collapse : 10;
  var report = { distinct: distinct, collapse: collapse, types: {} };
  TYPES.forEach(function (t) { report.types[t] = { conflicts: [], pass: true }; });
  for (var i = 0; i < hexes.length; i++) {
    for (var j = i + 1; j < hexes.length; j++) {
      var a = hexes[i], b = hexes[j], deN = deltaE(a, b);
      if (deN < distinct) continue;
      TYPES.forEach(function (t) {
        var deS = deltaE(simulate(a, t), simulate(b, t));
        if (deS < collapse) report.types[t].conflicts.push({ a: a, b: b, normal: +deN.toFixed(1), sim: +deS.toFixed(1), severity: deS < 5 ? "severe" : "risk" });
      });
    }
  }
  TYPES.forEach(function (t) { report.types[t].pass = report.types[t].conflicts.length === 0; });
  report.pass = TYPES.every(function (t) { return report.types[t].pass; });
  return report;
}

module.exports = {
  simulate: simulate, deltaE: deltaE, checkPalette: checkPalette, hexToLab: hexToLab,
  relLuminance: relLuminance, contrastRatio: contrastRatio, checkContrast: checkContrast,
  TYPES: TYPES
};
