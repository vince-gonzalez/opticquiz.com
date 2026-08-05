/*! opticquiz-eye — one-line colorblind accessibility widget.
 * mount() injects a floating eye that lets a visitor re-color the page (daltonization)
 * for their type of color-vision deficiency. Zero dependencies, zero tracking, SSR-safe.
 * Method: https://doi.org/10.5281/zenodo.21310578 · MIT. */
"use strict";

var M = {
  balanced: "0.9777 -0.7251 0.7474 0 0 0.3248 0.2051 0.4701 0 0 0.4547 -0.6454 1.1907 0 0 0 0 0 1 0",
  deutan: "0.60405 0.07601 0.31994 0 0 -0.04129 1.1157 -0.07441 0 0 -0.16981 0.3486 0.82122 0 0 0 0 0 1 0",
  protan: "0.91754 -0.07586 0.15832 0 0 0.06885 1.06936 -0.13821 0 0 -0.39655 0.59997 0.79659 0 0 0 0 0 1 0",
  tritan: "0.55608 0.64587 -0.20196 0 0 0.00319 0.7299 0.26692 0 0 -0.0079 0.02918 0.97873 0 0 0 0 0 1 0"
};
var MODES = [
  { id: "balanced", label: "Recommended", sub: "helps all types" },
  { id: "deutan", label: "Deuteranopia", sub: "green-weak, most common" },
  { id: "protan", label: "Protanopia", sub: "red-weak" },
  { id: "tritan", label: "Tritanopia", sub: "blue-yellow" },
  { id: null, label: "Off", sub: "normal colors" }
];
var KEY = "oq-eye-mode";
var SKEY = "oq-eye-strength";     // 0-100; 100 = full dichromacy correction

// M(s) = I + s*(M - I). Full strength is tuned for complete dichromacy, which is the
// MINORITY case - most colour-vision-deficient people are anomalous trichromats. On 10
// real palettes the full-strength matrices score negative net at severity 0.7 while the
// scaled ones score positive, at half the distortion. A blend of two matrices is still a
// matrix, so this stays one feColorMatrix.
var IDENT = [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0];
function scaled(key, pct) {
  var s = Math.max(0, Math.min(100, pct)) / 100;
  if (s >= 0.999) return M[key];
  var v = M[key].split(/\s+/).map(Number), o = [];
  for (var i = 0; i < 20; i++) o.push(+(IDENT[i] + s * (v[i] - IDENT[i])).toFixed(5));
  return o.join(" ");
}

function el(tag, css, attrs) {
  var e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

/** Inject the colorblind-correction eye widget. Safe to call once; no-op on the server. */
function mount() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (window.__oqEye) return; window.__oqEye = true;
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", build); }
  else build();
}

function build() {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var content = el("div", null, { id: "oq-a11y-content" });
  while (document.body.firstChild) content.appendChild(document.body.firstChild);
  document.body.appendChild(content);

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
    cm.setAttribute("type", "matrix"); cm.setAttribute("values", scaled(k, readStrength()));
      cm.setAttribute("data-oq-mode", k);
    f.appendChild(cm); defs.appendChild(f);
  }
  svg.appendChild(defs); document.body.appendChild(svg);

  var btn = el("button",
    "position:fixed;right:18px;bottom:18px;z-index:2147483647;width:48px;height:48px;border-radius:50%;border:2px solid #fff;background:#1A1A1A;color:#fff;font-size:22px;line-height:1;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:0;" + (reduce ? "" : "transition:background .15s;"),
    { type: "button", "aria-label": "Colorblind viewing options", "aria-haspopup": "true", "aria-expanded": "false" });
  btn.innerHTML = "👁";

  var menu = el("div",
    "position:fixed;right:18px;bottom:78px;z-index:2147483647;width:230px;background:#1A1A1A;color:#fff;border-radius:12px;box-shadow:0 6px 28px rgba(0,0,0,.45);padding:8px;font:14px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;",
    { role: "menu", "aria-label": "Colorblind viewing modes" });
  menu.hidden = true;

  var title = el("div", "font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.55;padding:6px 10px 8px;");
  title.textContent = "Colorblind view"; menu.appendChild(title);

  var items = [];
  MODES.forEach(function (m) {
    var it = el("button", "display:flex;flex-direction:column;gap:1px;width:100%;text-align:left;background:transparent;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font:inherit;",
      { type: "button", role: "menuitemradio", "aria-checked": "false", "data-mode": m.id || "off" });
    it.innerHTML = "<strong>" + m.label + "</strong><span style='font-size:13px;opacity:.6;'>" + m.sub + "</span>";
    it.addEventListener("mouseenter", function () { if (it.getAttribute("aria-checked") !== "true") it.style.background = "rgba(255,255,255,.08)"; });
    it.addEventListener("mouseleave", function () { if (it.getAttribute("aria-checked") !== "true") it.style.background = "transparent"; });
    it.addEventListener("click", function () { apply(m.id); close(); btn.focus(); });
    menu.appendChild(it); items.push({ mode: m.id || "off", el: it });
  });

  var foot = el("a", "display:block;font-size:13px;opacity:.55;text-decoration:none;color:#8ab4f8;padding:8px 10px 4px;", { href: "https://opticquiz.com/widget/", target: "_blank", rel: "noopener" });
  foot.textContent = "What is this? →"; // Strength control. Shown always: someone with mild deficiency needs it most, and
    // they are the least likely to go looking for a setting.
    var strRow = el("div", "padding:8px 12px 10px;border-top:1px solid rgba(255,255,255,.14);");
    var strLab = el("div",
      "display:flex;justify-content:space-between;font-size:13px;opacity:.75;margin-bottom:5px;");
    var strTxt = el("span"); strTxt.textContent = "Strength";
    var strNum = el("span"); strNum.textContent = readStrength() + "%";
    strLab.appendChild(strTxt); strLab.appendChild(strNum);
    var strIn = el("input", "width:100%;accent-color:#0072B2;",
      { type: "range", min: "0", max: "100", step: "5",
        value: String(readStrength()), "aria-label": "Correction strength" });
    strIn.addEventListener("input", function () {
      strNum.textContent = strIn.value + "%";
      try { localStorage.setItem(SKEY, strIn.value); } catch (e) {}
      refresh();
    });
    strRow.appendChild(strLab); strRow.appendChild(strIn);
    menu.appendChild(strRow);

    menu.appendChild(foot);

  function refresh() {
    var list = document.querySelectorAll("feColorMatrix[data-oq-mode]");
    for (var i = 0; i < list.length; i++) {
      list[i].setAttribute("values", scaled(list[i].getAttribute("data-oq-mode"), readStrength()));
    }
  }

  function apply(mode) {
    refresh();
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

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  apply(saved && M[saved] ? saved : null);
}

module.exports = { mount: mount };
if (typeof window !== "undefined") window.OpticQuizEye = { mount: mount };
