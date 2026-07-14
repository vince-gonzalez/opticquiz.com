/* OpticQuiz CVD engine — the shared core for the colorblind-safe checker,
   the future Figma plugin, the badge re-checker, and the API.
   Method: Machado, Oliveira & Fernandes (2009) severity-1.0 dichromat matrices
   (applied in LINEAR RGB); perceptual difference via CIEDE2000.
   Honest by construction: this simulates a MODEL of color-vision deficiency,
   not a guarantee about any individual observer. */
(function () {
  // Machado et al. (2009) severity=1.0 matrices, operate on linear RGB.
  var M = {
    protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
  };

  // Brettel, Vienot & Mollon (1997) on linear RGB — a second, independent model to
  // cross-check Machado. Two planes per type; sign of (rgb . n) selects. Transcribed
  // from the public-domain reference libDaltonLens (Nicolas Burrus).
  var B = {
    protan: { p1: [[0.14980, 1.19548, -0.34528], [0.10764, 0.84864, 0.04372], [0.00384, -0.00540, 1.00156]], p2: [[0.14570, 1.16172, -0.30742], [0.10816, 0.85291, 0.03892], [0.00386, -0.00524, 1.00139]], n: [0.00048, 0.00393, -0.00441] },
    deutan: { p1: [[0.36477, 0.86381, -0.22858], [0.26294, 0.64245, 0.09462], [-0.02006, 0.02728, 0.99278]], p2: [[0.37298, 0.88166, -0.25464], [0.25954, 0.63506, 0.10540], [-0.01980, 0.02784, 0.99196]], n: [-0.00281, -0.00611, 0.00892] },
    tritan: { p1: [[1.01277, 0.13548, -0.14826], [-0.01243, 0.86812, 0.14431], [0.07589, 0.80500, 0.11911]], p2: [[0.93678, 0.18979, -0.12657], [0.06154, 0.81526, 0.12320], [-0.37562, 1.12767, 0.24796]], n: [0.03901, -0.02788, -0.01113] }
  };

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function hexToRgb(h) {
    h = h.trim().replace(/^#/, "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r) {
    return "#" + r.map(function (v) { v = Math.round(clamp01(v / 255) * 255); return (v < 16 ? "0" : "") + v.toString(16); }).join("");
  }
  function sToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function linToS(c) { c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return clamp01(c) * 255; }

  // severity 0..1: 1 = full dichromacy (default); below 1 blends toward the original
  // in linear light to approximate anomalous trichromacy (mild/moderate CVD).
  function simulate(hex, type, severity, model) {
    if (type === "normal" || !M[type]) return hex.trim().toLowerCase();
    if (severity == null) severity = 1;
    var rgb = hexToRgb(hex), lin = [sToLin(rgb[0]), sToLin(rgb[1]), sToLin(rgb[2])], out = [0, 0, 0], i, m;
    if (model === "brettel") {
      var b = B[type], dot = lin[0] * b.n[0] + lin[1] * b.n[1] + lin[2] * b.n[2];
      m = dot >= 0 ? b.p1 : b.p2;
    } else {
      m = M[type];
    }
    for (i = 0; i < 3; i++) out[i] = clamp01(m[i][0] * lin[0] + m[i][1] * lin[1] + m[i][2] * lin[2]);
    if (severity < 1) for (var k = 0; k < 3; k++) out[k] = lin[k] * (1 - severity) + out[k] * severity;
    return rgbToHex([linToS(out[0]), linToS(out[1]), linToS(out[2])]);
  }

  // --- CIELAB + CIEDE2000 (D65) ---
  function rgbToXyz(rgb) {
    var r = sToLin(rgb[0]), g = sToLin(rgb[1]), b = sToLin(rgb[2]);
    return [
      (0.4124 * r + 0.3576 * g + 0.1805 * b) * 100,
      (0.2126 * r + 0.7152 * g + 0.0722 * b) * 100,
      (0.0193 * r + 0.1192 * g + 0.9505 * b) * 100
    ];
  }
  function xyzToLab(xyz) {
    var xn = 95.047, yn = 100, zn = 108.883;
    function f(t) { return t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t + 16 / 116); }
    var fx = f(xyz[0] / xn), fy = f(xyz[1] / yn), fz = f(xyz[2] / zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function hexToLab(hex) { return xyzToLab(rgbToXyz(hexToRgb(hex))); }

  // Inverse: CIELAB (D65) -> hex. floor(x+0.5) rounding matches the npm/PyPI engine.
  function labToHex(L, a, b) {
    var fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    function fi(t) { var t3 = t * t * t; return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787; }
    var X = fi(fx) * 95.047 / 100, Y = fi(fy) * 100 / 100, Z = fi(fz) * 108.883 / 100;
    var lin = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z];
    return "#" + lin.map(function (c) {
      c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(clamp01(c), 1 / 2.4) - 0.055;
      var v = Math.floor(clamp01(c) * 255 + 0.5);
      return (v < 16 ? "0" : "") + v.toString(16);
    }).join("");
  }

  function ciede2000(lab1, lab2) {
    var L1 = lab1[0], a1 = lab1[1], b1 = lab1[2], L2 = lab2[0], a2 = lab2[1], b2 = lab2[2];
    var avgLp = (L1 + L2) / 2;
    var C1 = Math.sqrt(a1 * a1 + b1 * b1), C2 = Math.sqrt(a2 * a2 + b2 * b2);
    var avgC = (C1 + C2) / 2;
    var G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
    var a1p = a1 * (1 + G), a2p = a2 * (1 + G);
    var C1p = Math.sqrt(a1p * a1p + b1 * b1), C2p = Math.sqrt(a2p * a2p + b2 * b2);
    var avgCp = (C1p + C2p) / 2;
    function hp(ap, bp) { if (ap === 0 && bp === 0) return 0; var h = Math.atan2(bp, ap) * 180 / Math.PI; return h < 0 ? h + 360 : h; }
    var h1p = hp(a1p, b1), h2p = hp(a2p, b2);
    var dLp = L2 - L1, dCp = C2p - C1p;
    var dhp;
    if (C1p * C2p === 0) dhp = 0;
    else { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
    var dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);
    var avghp;
    if (C1p * C2p === 0) avghp = h1p + h2p;
    else { if (Math.abs(h1p - h2p) > 180) avghp = (h1p + h2p + 360) / 2; else avghp = (h1p + h2p) / 2; }
    var T = 1 - 0.17 * Math.cos((avghp - 30) * Math.PI / 180) + 0.24 * Math.cos((2 * avghp) * Math.PI / 180)
      + 0.32 * Math.cos((3 * avghp + 6) * Math.PI / 180) - 0.20 * Math.cos((4 * avghp - 63) * Math.PI / 180);
    var dTheta = 30 * Math.exp(-Math.pow((avghp - 275) / 25, 2));
    var Rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
    var Sl = 1 + (0.015 * Math.pow(avgLp - 50, 2)) / Math.sqrt(20 + Math.pow(avgLp - 50, 2));
    var Sc = 1 + 0.045 * avgCp, Sh = 1 + 0.015 * avgCp * T;
    var Rt = -Math.sin(2 * dTheta * Math.PI / 180) * Rc;
    return Math.sqrt(Math.pow(dLp / Sl, 2) + Math.pow(dCp / Sc, 2) + Math.pow(dHp / Sh, 2) + Rt * (dCp / Sc) * (dHp / Sh));
  }

  function deltaE(hex1, hex2) { return ciede2000(hexToLab(hex1), hexToLab(hex2)); }

  // --- WCAG 2.x contrast (the legibility axis, independent of color-vision type) ---
  function relLuminance(hex) {
    var rgb = hexToRgb(hex);
    return 0.2126 * sToLin(rgb[0]) + 0.7152 * sToLin(rgb[1]) + 0.0722 * sToLin(rgb[2]);
  }
  function contrastRatio(hex1, hex2) {
    var l1 = relLuminance(hex1), l2 = relLuminance(hex2);
    var hi = l1 > l2 ? l1 : l2, lo = l1 > l2 ? l2 : l1;
    return (hi + 0.05) / (lo + 0.05);
  }
  function checkContrast(fg, bg, opts) {
    opts = opts || {};
    var large = !!opts.large, r = contrastRatio(fg, bg);
    return { ratio: +r.toFixed(2), large: large, AA: r >= (large ? 3 : 4.5), AAA: r >= (large ? 4.5 : 7), ui: r >= 3, pass: r >= (large ? 3 : 4.5) };
  }

  // Check a palette: for every pair distinguishable to normal vision (deNormal >= distinct),
  // flag it if a CVD simulation collapses the difference below `collapse`.
  function checkPalette(hexes, opts) {
    opts = opts || {};
    var distinct = opts.distinct != null ? opts.distinct : 13; // pair is INTENDED to be distinct (clearly different at a glance)
    var collapse = opts.collapse != null ? opts.collapse : 10;  // simulated dE below this = hard to tell apart (severe below 5)
    var severity = opts.severity != null ? opts.severity : 1;   // 1 = full dichromacy; <1 = anomalous trichromacy
    var model = opts.model || "machado";                        // 'machado' or 'brettel'
    var types = ["protan", "deutan", "tritan"];
    var report = { distinct: distinct, collapse: collapse, severity: severity, model: model, types: {} };
    types.forEach(function (t) { report.types[t] = { conflicts: [], pairsChecked: 0 }; });
    for (var i = 0; i < hexes.length; i++) {
      for (var j = i + 1; j < hexes.length; j++) {
        var a = hexes[i], b = hexes[j], deN = deltaE(a, b);
        types.forEach(function (t) {
          var r = report.types[t];
          if (deN < distinct) return; // not distinct even to normal vision — not a CVD-specific failure
          r.pairsChecked++;
          var deS = deltaE(simulate(a, t, severity, model), simulate(b, t, severity, model));
          if (deS < collapse) r.conflicts.push({ a: a, b: b, normal: +deN.toFixed(1), sim: +deS.toFixed(1), severity: deS < 5 ? "severe" : "risk" });
        });
      }
    }
    types.forEach(function (t) {
      var r = report.types[t];
      r.pass = r.conflicts.length === 0;
      r.worst = r.conflicts.reduce(function (m, c) { return Math.min(m, c.sim); }, 99);
    });
    report.pass = types.every(function (t) { return report.types[t].pass; });
    return report;
  }

  // fixPalette — return a colorblind-safe version of a failing palette, staying near
  // the originals by separating conflicting pairs in lightness (the axis CVD preserves).
  function fixPalette(hexes, opts) {
    opts = opts || {};
    var distinct = opts.distinct != null ? opts.distinct : 13;
    var collapse = opts.collapse != null ? opts.collapse : 10;
    var target = collapse + (opts.margin != null ? opts.margin : 2);
    var maxDrift = opts.maxDrift != null ? opts.maxDrift : 32;
    var step = 1.5, maxIter = opts.maxIter != null ? opts.maxIter : 600, T = ["protan", "deutan", "tritan"];
    var cur = hexes.map(hexToLab);
    function driftAt(i) { return deltaE(hexes[i], labToHex(cur[i][0], cur[i][1], cur[i][2])); }
    function worstPair() {
      var min = Infinity, wp = null, h = cur.map(function (l) { return labToHex(l[0], l[1], l[2]); });
      for (var i = 0; i < h.length; i++) for (var j = i + 1; j < h.length; j++) {
        if (deltaE(h[i], h[j]) < distinct) continue;
        for (var k = 0; k < T.length; k++) { var d = deltaE(simulate(h[i], T[k]), simulate(h[j], T[k])); if (d < min) { min = d; wp = [i, j]; } }
      }
      return { min: min === Infinity ? 99 : min, wp: wp };
    }
    for (var it = 0; it < maxIter; it++) {
      var s = worstPair();
      if (s.min >= target || !s.wp) break;
      var i = s.wp[0], j = s.wp[1], hi = cur[i][0] >= cur[j][0] ? i : j, lo = hi === i ? j : i, moved = false;
      [[hi, step], [lo, -step]].forEach(function (m) {
        var k = m[0], save = cur[k][0];
        cur[k][0] = Math.max(0, Math.min(100, cur[k][0] + m[1]));
        if (driftAt(k) > maxDrift) cur[k][0] = save; else if (cur[k][0] !== save) moved = true;
      });
      if (!moved) break;
    }
    var out = cur.map(function (l) { return labToHex(l[0], l[1], l[2]); });
    var report = checkPalette(out, { distinct: distinct, collapse: collapse });
    return { colors: out, drift: out.map(function (h, i) { return +driftAt(i).toFixed(1); }), pass: report.pass, residual: T.reduce(function (a, t) { return a + report.types[t].conflicts.length; }, 0) };
  }

  window.OQCVD = { simulate: simulate, deltaE: deltaE, checkPalette: checkPalette, fixPalette: fixPalette, hexToLab: hexToLab, labToHex: labToHex, relLuminance: relLuminance, contrastRatio: contrastRatio, checkContrast: checkContrast, TYPES: ["protan", "deutan", "tritan"] };
})();
