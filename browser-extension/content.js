// OpticQuiz Colorblind Corrector — content script.
// Applies a live daltonization color-correction to the current page via an SVG
// feColorMatrix filter (linear RGB). Same matrices as the OpticQuiz engine
// (Machado 2009 sim + Fidaner redistribution). No network, no tracking.
(function () {
  var M = {
    balanced: "0.9777 -0.7251 0.7474 0 0 0.3248 0.2051 0.4701 0 0 0.4547 -0.6454 1.1907 0 0 0 0 0 1 0",
    deutan: "0.60405 0.07601 0.31994 0 0 -0.04129 1.1157 -0.07441 0 0 -0.16981 0.3486 0.82122 0 0 0 0 0 1 0",
    protan: "0.91754 -0.07586 0.15832 0 0 0.06885 1.06936 -0.13821 0 0 -0.39655 0.59997 0.79659 0 0 0 0 0 1 0",
    tritan: "0.55608 0.64587 -0.20196 0 0 0.00319 0.7299 0.26692 0 0 -0.0079 0.02918 0.97873 0 0 0 0 0 1 0"
  };
  var KEY = "oq-cx-mode";
  var SKEY = "oq-cx-strength";          // 0-100; 100 = full dichromacy correction
  var current = null, strength = 100;

  // M(s) = I + s*(M - I).  Measured on 10 real palettes across 5 simulators: at severity
  // 0.7 the full-strength matrices score NEGATIVE net (protan -1, tritan -4) while the
  // scaled ones score +3 and +6, at roughly half the colour distortion. Most people with
  // a colour-vision deficiency are anomalous trichromats, not dichromats, so full strength
  // is the wrong default for the majority of the people this is for.
  // A convex blend of two matrices is still a matrix, so this stays an feColorMatrix and
  // costs nothing architecturally.
  var IDENT = [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0];
  function scaled(key, pct) {
    var s = Math.max(0, Math.min(100, pct)) / 100;
    if (s >= 0.999) return M[key];
    var v = M[key].split(/\s+/).map(Number);
    var out = [];
    for (var i = 0; i < 20; i++) out.push(+(IDENT[i] + s * (v[i] - IDENT[i])).toFixed(5));
    return out.join(" ");
  }

  function injectFilters() {
    if (document.getElementById("oq-cx-svg")) return true;
    var parent = document.body || document.documentElement;
    if (!parent) return false;
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.id = "oq-cx-svg";
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;");
    var defs = document.createElementNS(ns, "defs");
    for (var k in M) {
      var f = document.createElementNS(ns, "filter");
      f.setAttribute("id", "oq-cx-" + k);
      f.setAttribute("color-interpolation-filters", "linearRGB");
      var cm = document.createElementNS(ns, "feColorMatrix");
      cm.setAttribute("type", "matrix");
      cm.setAttribute("values", scaled(k, strength));
      cm.setAttribute("data-oq-mode", k);
      f.appendChild(cm); defs.appendChild(f);
    }
    svg.appendChild(defs);
    parent.appendChild(svg);
    return true;
  }

  function refreshMatrices() {
    var svg = document.getElementById("oq-cx-svg");
    if (!svg) return;
    var list = svg.querySelectorAll("feColorMatrix[data-oq-mode]");
    for (var i = 0; i < list.length; i++) {
      list[i].setAttribute("values", scaled(list[i].getAttribute("data-oq-mode"), strength));
    }
  }

  function apply(mode, pct) {
    if (typeof pct === "number") strength = pct;
    current = (mode && M[mode]) ? mode : null;
    if (!injectFilters()) return; // body not ready; DOMContentLoaded will retry
    refreshMatrices();
    document.documentElement.style.setProperty("filter", current ? "url(#oq-cx-" + current + ")" : "", "important");
  }

  // Restore the saved mode as early as possible.
  try {
    chrome.storage.local.get([KEY, SKEY], function (r) {
      apply(r && r[KEY], r && typeof r[SKEY] === "number" ? r[SKEY] : 100);
    });
  } catch (e) {}

  // ---- measured severity, from the person's own test ------------------------------
  // On opticquiz.com ONLY, read the on-device results the vision tests store and set the
  // correction strength from them. A content script shares its page's origin storage, so
  // this needs no extra permission and touches no other site.
  //
  // This closes the loop the literature says is missing: severity-personalised correction
  // normally requires a clinical diagnosis, which is why Hue4U (2025) had to build an
  // FM-100 test into a headset. The test is already here and free.
  function syncProfile() {
    if (location.hostname !== "opticquiz.com" && location.hostname !== "www.opticquiz.com") return;
    var raw;
    try { raw = localStorage.getItem("oq-results-v1"); } catch (e) { return; }
    if (!raw) return;
    var d;
    try { d = JSON.parse(raw); } catch (e) { return; }
    var t = d && d.tests; if (!t) return;

    // Same precedence the site uses: the arrangement test grades finer than a five-plate
    // screen. Kept in sync with assets/oq-results.js deliberately.
    var prof = null;
    if (t.d15 && t.d15.data && typeof t.d15.data.totalError === "number" &&
        t.d15.data.dominantAxis && t.d15.data.dominantAxis !== "none") {
      prof = { type: t.d15.data.dominantAxis,
               severity: Math.max(0, Math.min(1, (t.d15.data.totalError - 12) / 60)) };
    } else if (t.color && t.color.data && t.color.data.ctrlOK !== false &&
               typeof t.color.data.rgCorrect === "number") {
      var c = t.color.data, rg = c.rgTotal ? (c.rgTotal - c.rgCorrect) / c.rgTotal : 0,
          tr = c.tTotal ? ((c.tTotal - c.tCorrect) / c.tTotal) : 0;
      if (rg > 0 || tr > 0) prof = { type: tr > rg ? "tritan" : "red-green",
                                     severity: Math.max(rg, tr) };
    }
    if (!prof) return;
    try {
      chrome.storage.local.get(["oq-cx-profile"], function (r) {
        var old = r && r["oq-cx-profile"];
        // Only write when it actually changed, so a user who has since dragged the slider
        // is not overridden every time they revisit the site.
        if (old && old.type === prof.type && old.severity === prof.severity) return;
        var set = { "oq-cx-profile": prof };
        if (!old) set[SKEY] = Math.round(prof.severity * 100);  // first measurement seeds it
        chrome.storage.local.set(set);
      });
    } catch (e) {}
  }
  try { syncProfile(); } catch (e) {}

  // Re-apply once the body exists (needed when injected at document_start).
  document.addEventListener("DOMContentLoaded", function () { if (current) apply(current); });

  // Live updates: when the popup changes the saved mode, every page reacts.
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "local") return;
      if (changes[SKEY]) { strength = changes[SKEY].newValue; refreshMatrices(); }
      if (changes[KEY]) apply(changes[KEY].newValue);
    });
  } catch (e) {}
})();
