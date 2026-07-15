/*! OpticQuiz Colorblind Eye — a one-line accessibility widget.
    Drop <script src="https://.../eye.js" defer></script> on any page and a floating
    eye appears; clicking it cycles a live color CORRECTION for each type of color
    vision deficiency, then a balanced pass, then off.

    It re-colors the page so a colorblind visitor can DISTINGUISH colors (daltonization
    via SVG feColorMatrix in linear RGB) — it does not merely simulate. Correction
    strongly improves separation but is an aid, not a guarantee. Method:
    https://doi.org/10.5281/zenodo.21310578  ·  MIT licensed. */
(function () {
  if (window.__oqEye) return; window.__oqEye = true;

  // Daltonization matrices (I + R·(I−S)), computed from the OpticQuiz engine's
  // Machado 2009 simulation + Fidaner error-redistribution. Applied in linear RGB.
  var M = {
    protan: "1 0 0 0 0 0.4789 0.4769 0.0442 0 0 0.5973 -0.6887 1.0914 0 0 0 0 0 1 0",
    deutan: "1 0 0 0 0 0.1628 0.725 0.1122 0 0 0.4547 -0.6454 1.1907 0 0 0 0 0 1 0",
    tritan: "0.7412 -0.4072 0.666 0 0 0.0751 0.5852 0.3397 0 0 0 0 1 0 0 0 0 0 1 0",
    balanced: "0.9777 -0.7251 0.7474 0 0 0.3248 0.2051 0.4701 0 0 0.4547 -0.6454 1.1907 0 0 0 0 0 1 0"
  };
  // "Recommended" first — most people know "help," not their CVD type.
  var STATES = [
    { id: null, label: "Off" },
    { id: "balanced", label: "Recommended — helps all types" },
    { id: "deutan", label: "Deuteranopia (green-weak)" },
    { id: "protan", label: "Protanopia (red-weak)" },
    { id: "tritan", label: "Tritanopia (blue-yellow)" }
  ];

  function start() {
    // Wrap existing page content so the widget button itself is never recolored.
    var content = document.createElement("div");
    content.id = "oq-a11y-content";
    while (document.body.firstChild) content.appendChild(document.body.firstChild);
    document.body.appendChild(content);

    // Inject the SVG correction filters (linearRGB so the matrices are colorimetric).
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    var defs = document.createElementNS(ns, "defs");
    Object.keys(M).forEach(function (k) {
      var f = document.createElementNS(ns, "filter");
      f.setAttribute("id", "oq-f-" + k);
      f.setAttribute("color-interpolation-filters", "linearRGB");
      var cm = document.createElementNS(ns, "feColorMatrix");
      cm.setAttribute("type", "matrix");
      cm.setAttribute("values", M[k]);
      f.appendChild(cm); defs.appendChild(f);
    });
    svg.appendChild(defs); document.body.appendChild(svg);

    // Floating eye button + a transient label.
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Colorblind view — click to cycle corrections");
    btn.innerHTML = "👁";
    btn.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647;width:48px;height:48px;border-radius:50%;border:2px solid #fff;background:#1A1A1A;color:#fff;font-size:22px;line-height:1;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:0;";
    var label = document.createElement("div");
    label.setAttribute("role", "status");
    label.style.cssText = "position:fixed;right:74px;bottom:28px;z-index:2147483647;background:#1A1A1A;color:#fff;font:13px/1.2 system-ui,-apple-system,sans-serif;padding:7px 13px;border-radius:16px;opacity:0;transition:opacity .2s;pointer-events:none;white-space:nowrap;box-shadow:0 2px 12px rgba(0,0,0,.3);";

    var state = 0, timer;
    function apply() {
      var s = STATES[state];
      content.style.filter = s.id ? "url(#oq-f-" + s.id + ")" : "";
      btn.style.background = s.id ? "#0072B2" : "#1A1A1A";
      label.textContent = "OpticQuiz · " + s.label;
      label.style.opacity = "1";
      clearTimeout(timer); timer = setTimeout(function () { label.style.opacity = "0"; }, 1900);
    }
    btn.addEventListener("click", function () { state = (state + 1) % STATES.length; apply(); });
    document.body.appendChild(btn); document.body.appendChild(label);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
