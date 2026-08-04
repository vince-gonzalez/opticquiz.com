// OpticQuiz Colorblind Corrector — content script.
// Applies a live daltonization color-correction to the current page via an SVG
// feColorMatrix filter (linear RGB). Same matrices as the OpticQuiz engine
// (Machado 2009 sim + Fidaner redistribution). No network, no tracking.
(function () {
  var M = {
    balanced: "0.9777 -0.7251 0.7474 0 0 0.3248 0.2051 0.4701 0 0 0.4547 -0.6454 1.1907 0 0 0 0 0 1 0",
    deutan: "0.99925 -0.00124 0.00199 0 0 0.31491 0.86984 -0.18475 0 0 0.57734 -0.28941 0.71207 0 0 0 0 0 1 0",
    protan: "1 0 0 0 0 0.4789 0.4769 0.0442 0 0 0.5973 -0.6887 1.0914 0 0 0 0 0 1 0",
    tritan: "0.55608 0.64587 -0.20196 0 0 0.00319 0.7299 0.26692 0 0 -0.0079 0.02918 0.97873 0 0 0 0 0 1 0"
  };
  var KEY = "oq-cx-mode";
  var current = null;

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
      cm.setAttribute("values", M[k]);
      f.appendChild(cm); defs.appendChild(f);
    }
    svg.appendChild(defs);
    parent.appendChild(svg);
    return true;
  }

  function apply(mode) {
    current = (mode && M[mode]) ? mode : null;
    if (!injectFilters()) return; // body not ready; DOMContentLoaded will retry
    document.documentElement.style.setProperty("filter", current ? "url(#oq-cx-" + current + ")" : "", "important");
  }

  // Restore the saved mode as early as possible.
  try {
    chrome.storage.local.get([KEY], function (r) { apply(r && r[KEY]); });
  } catch (e) {}

  // Re-apply once the body exists (needed when injected at document_start).
  document.addEventListener("DOMContentLoaded", function () { if (current) apply(current); });

  // Live updates: when the popup changes the saved mode, every page reacts.
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === "local" && changes[KEY]) apply(changes[KEY].newValue);
    });
  } catch (e) {}
})();
