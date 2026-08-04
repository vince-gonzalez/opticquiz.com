/*! OpticQuiz Colorblind Eye — a one-line accessibility widget.
    Drop <script src="https://opticquiz.com/widget/eye.js" defer></script> on any page.
    A floating eye appears; opening it lets a visitor pick a live color CORRECTION for
    their type of color-vision deficiency (or "Recommended" if they don't know it).

    It re-colors the page so a colorblind visitor can DISTINGUISH colors (daltonization
    via SVG feColorMatrix in linear RGB) — it does not merely simulate. Correction
    strongly improves separation but is an aid, not a guarantee.

    Known limitation: it applies one filter to a wrapper, so on pages that rely on
    position:fixed / sticky elements the layout can shift while a mode is on, and it
    cannot exempt individual elements (e.g. photos). A per-element strategy is planned.

    Privacy: zero tracking, no network, no identifiers. Choice is stored only in this
    browser's localStorage. Method: https://doi.org/10.5281/zenodo.21310578 · MIT. */
(function () {
  if (window.__oqEye) return; window.__oqEye = true;

  // Daltonization matrices (I + R·(I−S)) from the OpticQuiz Machado sim + Fidaner
  // redistribution. Applied in linear RGB.
  var M = {
    balanced: "0.9777 -0.7251 0.7474 0 0 0.3248 0.2051 0.4701 0 0 0.4547 -0.6454 1.1907 0 0 0 0 0 1 0",
    deutan: "0.60405 0.07601 0.31994 0 0 -0.04129 1.1157 -0.07441 0 0 -0.16981 0.3486 0.82122 0 0 0 0 0 1 0",
    protan: "0.91754 -0.07586 0.15832 0 0 0.06885 1.06936 -0.13821 0 0 -0.39655 0.59997 0.79659 0 0 0 0 0 1 0",
    tritan: "0.55608 0.64587 -0.20196 0 0 0.00319 0.7299 0.26692 0 0 -0.0079 0.02918 0.97873 0 0 0 0 0 1 0"
  };
  // "Recommended" first — most people know "help," not their CVD type.
  var MODES = [
    { id: "balanced", label: "Recommended", sub: "helps all types" },
    { id: "deutan", label: "Deuteranopia", sub: "green-weak, most common" },
    { id: "protan", label: "Protanopia", sub: "red-weak" },
    { id: "tritan", label: "Tritanopia", sub: "blue-yellow" },
    { id: null, label: "Off", sub: "normal colors" }
  ];
  var KEY = "oq-eye-mode";

  function el(tag, css, attrs) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function start() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Wrap page content so the widget UI is never recolored.
    var content = el("div", null, { id: "oq-a11y-content" });
    while (document.body.firstChild) content.appendChild(document.body.firstChild);
    document.body.appendChild(content);

    // SVG correction filters (linearRGB so the matrices are colorimetric).
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    var defs = document.createElementNS(ns, "defs");
    for (var k in M) {
      var f = document.createElementNS(ns, "filter");
      f.setAttribute("id", "oq-f-" + k);
      f.setAttribute("color-interpolation-filters", "linearRGB");
      var cm = document.createElementNS(ns, "feColorMatrix");
      cm.setAttribute("type", "matrix");
      cm.setAttribute("values", M[k]);
      f.appendChild(cm); defs.appendChild(f);
    }
    svg.appendChild(defs); document.body.appendChild(svg);

    // Button
    var btn = el("button",
      "position:fixed;right:18px;bottom:18px;z-index:2147483647;width:48px;height:48px;border-radius:50%;border:2px solid #fff;background:#1A1A1A;color:#fff;font-size:22px;line-height:1;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:0;" + (reduce ? "" : "transition:background .15s;"),
      { type: "button", "aria-label": "Colorblind viewing options", "aria-haspopup": "true", "aria-expanded": "false" });
    btn.innerHTML = "👁";

    // Menu (popover)
    var menu = el("div",
      "position:fixed;right:18px;bottom:78px;z-index:2147483647;width:230px;background:#1A1A1A;color:#fff;border-radius:12px;box-shadow:0 6px 28px rgba(0,0,0,.45);padding:8px;font:14px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;",
      { role: "menu", "aria-label": "Colorblind viewing modes" });
    menu.hidden = true;

    var title = el("div", "font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.55;padding:6px 10px 8px;");
    title.textContent = "Colorblind view";
    menu.appendChild(title);

    function itemCss(active) {
      return "display:flex;flex-direction:column;gap:1px;width:100%;text-align:left;background:" + (active ? "#0072B2" : "transparent") + ";color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font:inherit;";
    }
    var items = [];
    MODES.forEach(function (m) {
      var it = el("button", itemCss(false), { type: "button", role: "menuitemradio", "aria-checked": "false", "data-mode": m.id || "off" });
      it.innerHTML = "<strong>" + m.label + "</strong><span style='font-size:12px;opacity:.6;'>" + m.sub + "</span>";
      it.addEventListener("mouseenter", function () { if (it.getAttribute("aria-checked") !== "true") it.style.background = "rgba(255,255,255,.08)"; });
      it.addEventListener("mouseleave", function () { if (it.getAttribute("aria-checked") !== "true") it.style.background = "transparent"; });
      it.addEventListener("click", function () { apply(m.id); close(); btn.focus(); });
      menu.appendChild(it); items.push({ mode: m.id || "off", el: it });
    });

    var foot = el("a", "display:block;font-size:11px;opacity:.55;text-decoration:none;color:#8ab4f8;padding:8px 10px 4px;", { href: "https://opticquiz.com/checker/", target: "_blank", rel: "noopener" });
    foot.textContent = "What is this? →";
    menu.appendChild(foot);

    function apply(mode) {
      content.style.filter = mode ? "url(#oq-f-" + mode + ")" : "";
      btn.style.background = mode ? "#0072B2" : "#1A1A1A";
      try { mode ? localStorage.setItem(KEY, mode) : localStorage.removeItem(KEY); } catch (e) {}
      items.forEach(function (o) {
        var on = o.mode === (mode || "off");
        o.el.setAttribute("aria-checked", on ? "true" : "false");
        o.el.style.background = on ? "#0072B2" : "transparent";
      });
    }
    function open() { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); (items[0] && items[0].el).focus(); }
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", function () { menu.hidden ? open() : close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { close(); btn.focus(); } });
    document.addEventListener("click", function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close(); });

    document.body.appendChild(btn); document.body.appendChild(menu);

    // Restore the visitor's last choice.
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    apply(saved && M[saved] ? saved : null);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
