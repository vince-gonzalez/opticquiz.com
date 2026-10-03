/*! opticquiz-eye — one-line colorblind accessibility widget.
 *
 * mount() injects a floating eye that lets a visitor pick a live color CORRECTION for their
 * type of color-vision deficiency. Zero dependencies, zero tracking, SSR-safe.
 *
 * v2 recolors computed STYLE rather than filtering pixels. Photographs, video and canvas are
 * never touched, and nothing is filtered, so position:fixed and sticky behave exactly as you
 * wrote them. Text is forced to pure black or white against its corrected backdrop, so every
 * text run clears WCAG AA by construction — worst case 4.58:1, which is where black and white
 * tie at backdrop luminance 0.179. Graphics (backgrounds, borders, SVG fill and stroke) take
 * the full correction, because that is where the color-coded information lives.
 *
 * The previous release applied one SVG filter to a wrapper element, which moved lightness as
 * well as hue and could push text below AA — on opticquiz.com's own twelve text/background
 * pairs it pushed eight below, worst 3.22:1. If you pinned 1.2.x for stability, this is the
 * upgrade worth taking.
 *
 * Generated from widget/engine.js — do not edit by hand.
 * Method: https://doi.org/10.5281/zenodo.21310578 · MIT */
  var M = OQ_ENGINE.M, MODES = OQ_ENGINE.MODES;
  var KEY = "oq-eye-mode";
  var SKEY = "oq-eye-strength";
  var engine = null, current = null, mounted = false;

  function el(tag, css, attrs) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function readStrength() {
    try { var v = parseInt(localStorage.getItem(SKEY), 10); return isNaN(v) ? 100 : v; }
    catch (e) { return 100; }
  }
  function paint() { if (engine) engine.paint(current, readStrength()); }

  function mount() {
    // SSR-safe and idempotent: no document means nothing to do, and a second call is a no-op.
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (mounted || window.__oqEye) return;
    mounted = true; window.__oqEye = true;

    engine = OQ_ENGINE.create(window, { styleId: "oq-eye-sheet", attr: "data-oq-c", uiAttr: "data-oq-ui" });

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
    else build();
  }

  function build() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var btn = el("button",
      "position:fixed;right:18px;bottom:18px;z-index:2147483647;width:48px;height:48px;border-radius:50%;border:2px solid #fff;background:#1A1A1A;color:#fff;font-size:22px;line-height:1;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:0;" + (reduce ? "" : "transition:background .15s;"),
      { type: "button", "aria-label": "Colorblind viewing options", "aria-haspopup": "true", "aria-expanded": "false", "data-oq-ui": "" });
    btn.innerHTML = "👁";

    var menu = el("div",
      "position:fixed;right:18px;bottom:78px;z-index:2147483647;width:236px;background:#1A1A1A;color:#fff;border-radius:12px;box-shadow:0 6px 28px rgba(0,0,0,.45);padding:8px;font:14px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;",
      { role: "menu", "aria-label": "Colorblind viewing modes", "data-oq-ui": "" });
    menu.hidden = true;

    var title = el("div", "font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.6;padding:6px 10px 8px;");
    title.textContent = "Colorblind view";
    menu.appendChild(title);

    var items = [];
    MODES.forEach(function (mo) {
      var it = el("button",
        "display:flex;flex-direction:column;gap:1px;width:100%;text-align:left;background:transparent;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font:inherit;",
        { type: "button", role: "menuitemradio", "aria-checked": "false" });
      it.innerHTML = "<strong>" + mo.label + "</strong><span style='font-size:13px;opacity:.72;'>" + mo.sub + "</span>";
      it.addEventListener("mouseenter", function () { if (it.getAttribute("aria-checked") !== "true") it.style.background = "rgba(255,255,255,.1)"; });
      it.addEventListener("mouseleave", function () { if (it.getAttribute("aria-checked") !== "true") it.style.background = "transparent"; });
      it.addEventListener("click", function () { apply(mo.id); close(); btn.focus(); });
      menu.appendChild(it); items.push({ mode: mo.id || "off", el: it });
    });

    var strRow = el("div", "padding:8px 12px 10px;border-top:1px solid rgba(255,255,255,.16);");
    var strLab = el("div", "display:flex;justify-content:space-between;font-size:13px;opacity:.82;margin-bottom:5px;");
    var strTxt = el("span"); strTxt.textContent = "Graphic strength";
    var strNum = el("span"); strNum.textContent = readStrength() + "%";
    strLab.appendChild(strTxt); strLab.appendChild(strNum);
    var strIn = el("input", "width:100%;accent-color:#0072B2;",
      { type: "range", min: "0", max: "100", step: "5", value: String(readStrength()), "aria-label": "Correction strength for graphics" });
    var strT = null;
    strIn.addEventListener("input", function () {
      strNum.textContent = strIn.value + "%";
      try { localStorage.setItem(SKEY, strIn.value); } catch (e) {}
      clearTimeout(strT); strT = setTimeout(function () { paint(); syncNote(); }, 90);
    });
    strRow.appendChild(strLab); strRow.appendChild(strIn);
    menu.appendChild(strRow);

    var note = el("div", "font-size:13px;line-height:1.45;opacity:.8;padding:2px 10px 6px;");
    menu.appendChild(note);

    function syncNote() {
      note.textContent = (engine.standDown() && current)
        ? "Your system's own contrast settings are active, so they are left in charge."
        : "Text is set to black or white for maximum contrast. Photos are never altered.";
    }

    function apply(mode) {
      current = mode;
      paint();
      btn.style.background = mode ? "#0072B2" : "#1A1A1A";
      try { mode ? localStorage.setItem(KEY, mode) : localStorage.removeItem(KEY); } catch (e) {}
      items.forEach(function (o) {
        var on = o.mode === (mode || "off");
        o.el.setAttribute("aria-checked", on ? "true" : "false");
        o.el.style.background = on ? "#0072B2" : "transparent";
      });
      syncNote();
    }
    function open() { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); if (items[0]) items[0].el.focus(); }
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", function () { menu.hidden ? open() : close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { close(); btn.focus(); } });
    document.addEventListener("click", function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close(); });

    document.body.appendChild(btn);
    document.body.appendChild(menu);

    // A host app re-renders; anything mounted after activation needs correcting too.
    var pending = false;
    if (window.MutationObserver) {
      new MutationObserver(function (recs) {
        if (!current || pending) return;
        for (var i = 0; i < recs.length; i++) if (recs[i].addedNodes.length) {
          pending = true;
          setTimeout(function () { pending = false; paint(); }, 120);
          return;
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
    if (window.matchMedia) {
      var mq = window.matchMedia("(forced-colors: active)");
      if (mq.addEventListener) mq.addEventListener("change", function () { paint(); syncNote(); });
    }

    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    apply(saved && M[saved] ? saved : null);

    window.OQEye = {
      set: apply,
      get: function () { return current; },
      active: function () { return !!current && engine.active(); },
      standDown: function () { return engine.standDown(); }
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { mount: mount };
  if (typeof window !== "undefined") window.OpticQuizEye = { mount: mount };
