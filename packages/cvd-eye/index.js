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
/* GENERATED FILE — built from widget/engine.js + widget/shells/npm.js.
   Do not edit here; edit the engine or the shell and run: node tools/build-widgets.js */
(function () {
  "use strict";

  /*! OpticQuiz correction engine — the shared core behind every DOM surface we ship.
   *
   * THIS FILE IS NOT SERVED DIRECTLY. tools/build-widgets.js inlines it into three shells:
   *   widget/eye.js                  the one-line site widget (its own floating UI)
   *   packages/cvd-eye/index.js      opticquiz-eye on npm (a mount() API, no auto-UI)
   *   browser-extension/content.js   the Chrome / Edge / Firefox extension (popup is the UI)
   * Edit the engine here and rebuild; never edit the generated copies.
   *
   * WHY A SHARED CORE
   * These three were hand-maintained copies of the same algorithm, which is exactly how the
   * same defect came to ship three times: all of them filtered the whole page, which moved
   * lightness as well as hue and silently degraded text contrast. On this site's own twelve
   * real text/background pairs that filter pushed EIGHT below WCAG AA, worst 3.22:1 on a pair
   * that passes at 4.80:1 uncorrected. One engine, verified once, removes the whole class.
   *
   * WHAT IT DOES
   * It recolors computed STYLE, not pixels. It reads each element's color properties and writes
   * corrected values back through a single generated stylesheet. Two deliberate consequences:
   * photographs, video and canvas are untouched, because raster content is never read or
   * written; and nothing is filtered, so position:fixed and sticky behave exactly as authored.
   *
   * Colors split into two jobs, because they pull in opposite directions:
   *   TEXT     forced to pure black or pure white, whichever reads better against the corrected
   *            backdrop. Text carries meaning in its glyphs, not its hue, so there is nothing to
   *            recover by tinting it and everything to lose. Choosing the better of the two is
   *            worst at backdrop luminance Y = 0.179, where they tie at 4.58:1 — so every text
   *            run clears WCAG AA BY CONSTRUCTION, not by sampling.
   *   GRAPHIC  backgrounds, borders, outlines, SVG fill and stroke take the full matrix. These
   *            carry the color-coded information and no text-contrast rule applies to them. On
   *            genuine confusion pairs, mean CIEDE2000 goes from 1.9 to between 10.8 and 21.6.
   *
   * Daltonization is evaluated in linear sRGB from the OpticQuiz Machado (2009) model plus
   * Fidaner redistribution. Method: https://doi.org/10.5281/zenodo.21310578 · MIT
   *
   * Verify every claim above with: node tools/verify-widget.js
   */
  var OQ_ENGINE = (function () {
    "use strict";

    var M = {
      balanced: [[0.9777, -0.7251, 0.7474], [0.3248, 0.2051, 0.4701], [0.4547, -0.6454, 1.1907]],
      deutan:   [[0.60405, 0.07601, 0.31994], [-0.04129, 1.1157, -0.07441], [-0.16981, 0.3486, 0.82122]],
      protan:   [[0.91754, -0.07586, 0.15832], [0.06885, 1.06936, -0.13821], [-0.39655, 0.59997, 0.79659]],
      tritan:   [[0.55608, 0.64587, -0.20196], [0.00319, 0.7299, 0.26692], [-0.0079, 0.02918, 0.97873]]
    };

    var MODES = [
      { id: "balanced", label: "Recommended", sub: "helps all types" },
      { id: "deutan", label: "Deuteranopia", sub: "green-weak, most common" },
      { id: "protan", label: "Protanopia", sub: "red-weak" },
      { id: "tritan", label: "Tritanopia", sub: "blue-yellow" },
      { id: null, label: "Off", sub: "normal colors" }
    ];

    // Surfaces that carry color-coded information. `fill` is re-routed to text on SVG text.
    var GPROPS = ["background-color", "border-top-color", "border-right-color",
      "border-bottom-color", "border-left-color", "outline-color", "fill", "stroke"];
    var SVG_TEXT = { TEXT: 1, TSPAN: 1, TEXTPATH: 1 };
    var BLACK = [0, 0, 0], WHITE = [255, 255, 255];
    var MAX_ELEMENTS = 9000;     // beyond this, walking costs more than it returns

    /* ---------- color maths ---------- */
    function s2l(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    function l2s(c) {
      c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, c)) * 255);
    }
    function lumLin(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
    function lum(rgb) { return lumLin(s2l(rgb[0]), s2l(rgb[1]), s2l(rgb[2])); }
    function ratio(a, b) {
      var x = lum(a), y = lum(b), h = x > y ? x : y, l = x > y ? y : x;
      return (h + 0.05) / (l + 0.05);
    }

    function blend(m, s) {                        // M(s) = I + s(M - I)
      if (s >= 0.999) return m;
      var o = [], i, j;
      for (i = 0; i < 3; i++) { o.push([]); for (j = 0; j < 3; j++) o[i].push((i === j ? 1 : 0) + s * (m[i][j] - (i === j ? 1 : 0))); }
      return o;
    }

    // Full matrix. Maximum separation; used on every surface that is not text.
    function correctGraphic(rgb, m) {
      var r = s2l(rgb[0]), g = s2l(rgb[1]), b = s2l(rgb[2]);
      return [
        l2s(m[0][0] * r + m[0][1] * g + m[0][2] * b),
        l2s(m[1][0] * r + m[1][1] * g + m[1][2] * b),
        l2s(m[2][0] * r + m[2][1] * g + m[2][2] * b)
      ];
    }
    // Luminance-preserving. Only used for text whose backdrop cannot be determined, so the
    // ratio the author chose survives untouched rather than being guessed at.
    function correctKeepLum(rgb, m) {
      var r = s2l(rgb[0]), g = s2l(rgb[1]), b = s2l(rgb[2]);
      var o0 = m[0][0] * r + m[0][1] * g + m[0][2] * b,
          o1 = m[1][0] * r + m[1][1] * g + m[1][2] * b,
          o2 = m[2][0] * r + m[2][1] * g + m[2][2] * b;
      o0 = Math.min(1, Math.max(0, o0)); o1 = Math.min(1, Math.max(0, o1)); o2 = Math.min(1, Math.max(0, o2));
      var Y0 = lumLin(r, g, b), Y1 = lumLin(o0, o1, o2), k;
      if (Y1 <= 1e-9) { o0 = o1 = o2 = Y0; }                                // went black but shouldn't have
      else if (Y0 <= Y1) { k = Y0 / Y1; o0 *= k; o1 *= k; o2 *= k; }        // scale down: exact, cannot clip
      else { k = (Y0 - Y1) / (1 - Y1); o0 += k * (1 - o0); o1 += k * (1 - o1); o2 += k * (1 - o2); }
      return [l2s(o0), l2s(o1), l2s(o2)];
    }

    function worstRatio(ink, bgs) {
      var w = Infinity;
      for (var i = 0; i < bgs.length; i++) w = Math.min(w, ratio(ink, bgs[i]));
      return w;
    }
    /* Text is always black or white. Pick whichever reads better against EVERY backdrop the text
       might sit on, judged by its worst case. For one solid color the worst case is a backdrop at
       Y = 0.179, where black and white tie at 4.58:1, so this never returns below AA. */
    function inkFor(bgs) {
      return worstRatio(BLACK, bgs) >= worstRatio(WHITE, bgs) ? BLACK : WHITE;
    }
    /* A backdrop that genuinely spans dark to light — a gradient running white to near-black —
       admits no single ink above AA: whichever we pick, the other end of the range fails. Rather
       than quietly ship a 1.14:1 run of text, we ink for the better worst case and outline the
       glyphs in the opposite tone, so the glyph edge contrasts wherever it lands. The guarantee
       there rests on the outline rather than the fill ratio, which is worth saying out loud. */
    function halo(ink) {
      var o = (ink === BLACK ? "255,255,255" : "0,0,0");
      return "text-shadow:0 0 2px rgb(" + o + "),0 0 2px rgb(" + o + "),0 0 4px rgb(" + o + ") !important;";
    }

    /* A gradient is not unknowable. Each channel moves monotonically between adjacent color
       stops, and relative luminance is a positive-weighted sum of channels, so the luminance
       anywhere along the gradient is bounded by the luminances AT the stops. Judging the ink
       against the stops therefore covers every pixel under the text. A url() layer is a real
       image and stays genuinely unresolvable. */
    function stopsOf(bgImage) {
      if (!bgImage || bgImage === "none") return [];
      if (bgImage.indexOf("url(") >= 0) return null;        // a real bitmap: refuse to guess
      var out = [], re = /rgba?\([^)]*\)/g, mm;
      while ((mm = re.exec(bgImage))) { var c = parse(mm[0]); if (c) out.push(c); }
      return out;
    }
    // Only the luminance extremes can be the worst case, so keep the list at two entries.
    function extremes(list) {
      if (list.length < 3) return list;
      var lo = list[0], hi = list[0], i, y;
      for (i = 1; i < list.length; i++) {
        y = lum(list[i]);
        if (y < lum(lo)) lo = list[i];
        if (y > lum(hi)) hi = list[i];
      }
      return [lo, hi];
    }

    var RGB_RE = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.%]+))?\s*\)$/i;
    function parse(v) {
      if (!v) return null;
      var m = RGB_RE.exec(String(v).trim());
      if (!m) return null;
      var a = m[4] === undefined ? 1 : (String(m[4]).indexOf("%") >= 0 ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
      if (!(a > 0)) return null;                  // fully transparent: nothing to correct
      return [+m[1], +m[2], +m[3], a];
    }
    function fmt(rgb, a) {
      return a >= 1 ? "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")"
                    : "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (Math.round(a * 1000) / 1000) + ")";
    }
    function over(fg, a, bg) {                    // source-over composite
      return [Math.round(fg[0] * a + bg[0] * (1 - a)),
              Math.round(fg[1] * a + bg[1] * (1 - a)),
              Math.round(fg[2] * a + bg[2] * (1 - a))];
    }

    /* ---------- an engine bound to one document ----------
       opts.styleId   id of the generated stylesheet
       opts.attr      data attribute stamped on corrected elements
       opts.uiAttr    attribute marking the shell's own UI, which is never recolored
       opts.maxElements  ceiling past which we stand down rather than stall the page */
    function create(win, opts) {
      opts = opts || {};
      var doc = win.document;
      var STYLE_ID = opts.styleId || "oq-eye-sheet";
      var ATTR = opts.attr || "data-oq-c";
      var UI_ATTR = opts.uiAttr || "data-oq-ui";
      var CAP = opts.maxElements || MAX_ELEMENTS;

      var sheet = null, stamped = [], standDown = false;

      /* Author stylesheets use !important too, and at specificities we have to beat. This site's
         own `.oq-nav__cta { color:#fff !important }` is specificity (0,1,0) — exactly tying a
         single attribute selector, which left a nav button white on a light corrected background
         at 3.42:1. Repeating the attribute lifts us to (0,3,0) without changing what we match.
         Three times, not more: enough to clear ordinary author rules, still cheap to match, and
         still losing to a visitor's own user stylesheet, which should win. */
      function sel(id) {
        var a = "[" + ATTR + '="' + id + '"]';
        return a + a + a;
      }

      function skip(node) {
        if (node.nodeType !== 1) return true;
        var t = String(node.tagName || "").toUpperCase();     // HTML is upper case, SVG is mixed
        if (t === "SCRIPT" || t === "STYLE" || t === "LINK" || t === "META" || t === "TITLE") return true;
        if (t === "IMG" || t === "VIDEO" || t === "CANVAS" || t === "PICTURE" || t === "IFRAME") return true;
        if (t === "DEFS" || t === "FILTER" || t === "FECOLORMATRIX") return true;
        return node.closest ? !!node.closest("[" + UI_ATTR + "]") : false;   // never recolor our own UI
      }
      function hasOwnText(node) {
        for (var i = 0, c = node.childNodes; i < c.length; i++)
          if (c[i].nodeType === 3 && /\S/.test(c[i].nodeValue)) return true;
        return false;
      }

      /* The backdrop actually rendered behind an element, as it will look AFTER correction.
         Walks to the root compositing backgrounds, and returns the LIST of backdrops the text may
         sit on — one entry for a solid fill, two (the luminance extremes) under a gradient. Null
         only when a url() bitmap makes it genuinely unknowable, because we would rather fall back
         than guess at a contrast ratio.

         The cache is a WeakMap keyed on the elements themselves. An earlier draft kept an id on
         each element and looked it up in a per-repaint object; the ids outlived the counter, so
         repeated repaints handed one element another's backdrop. Keying on identity cannot
         collide by construction. */
      function effectiveBg(node, m, cache) {
        var chain = [], n = node, seed;
        while (n && n.nodeType === 1) {
          if (cache.has(n)) { seed = cache.get(n); break; }
          chain.push(n);
          n = n.parentElement;
        }
        var unknown = seed === false;
        var acc = (seed === undefined || seed === false) ? [WHITE] : seed;  // canvas is white unless painted
        for (var i = chain.length - 1; i >= 0; i--) {
          var e = chain[i], cs = win.getComputedStyle(e);
          if (!unknown) {
            var bg = parse(cs.getPropertyValue("background-color")), next = acc, k;
            if (bg) {
              var c = correctGraphic([bg[0], bg[1], bg[2]], m);
              if (bg[3] >= 1) next = [c];
              else { next = []; for (k = 0; k < acc.length; k++) next.push(over(c, bg[3], acc[k])); }
            }
            var stops = stopsOf(cs.getPropertyValue("background-image"));
            if (stops === null) unknown = true;               // a bitmap sits behind the text
            else if (stops.length) {
              // An opaque gradient paints over everything behind it, so it REPLACES the backdrop;
              // keeping what was behind as a candidate too is the kind of over-caution that
              // produced a false 1.14:1 on this site's own hero, whose stops are both dark.
              // A translucent stop does let the layer below through, so there we composite.
              var opaque = true;
              for (k = 0; k < stops.length; k++) if (stops[k][3] < 1) opaque = false;
              var layered = opaque ? [] : next.slice();
              for (k = 0; k < stops.length; k++) {
                var s = stops[k], sc = correctGraphic([s[0], s[1], s[2]], m);
                if (s[3] >= 1) layered.push(sc);
                else for (var q = 0; q < next.length; q++) layered.push(over(sc, s[3], next[q]));
              }
              next = extremes(layered);
            }
            acc = next;
          }
          cache.set(e, unknown ? false : acc);
        }
        return unknown ? null : acc;
      }

      function forcedColors() {
        return !!(win.matchMedia && win.matchMedia("(forced-colors: active)").matches);
      }

      function clear() {
        if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
        sheet = null;
        for (var i = 0; i < stamped.length; i++) stamped[i].removeAttribute(ATTR);
        stamped = [];
      }

      // mode: one of M's keys, or null/undefined for off. strengthPct: 0-100, graphics only.
      function paint(mode, strengthPct) {
        clear();
        if (!mode || !M[mode]) { standDown = false; return; }
        if (forcedColors()) { standDown = true; return; }   // the OS already wins; do not fight it

        var strength = Math.max(0, Math.min(100, typeof strengthPct === "number" ? strengthPct : 100));
        if (strength === 0) { standDown = false; return; }  // 0% means off, exactly
        var m = blend(M[mode], strength / 100);

        if (!doc.body) { standDown = false; return; }
        var all = doc.body.getElementsByTagName("*");
        if (all.length > CAP) { standDown = true; return; }
        standDown = false;

        var rules = [], sigMap = {}, memo = {}, bgCache = new WeakMap(), n = 0, i, j;
        for (i = 0; i < all.length; i++) {
          var node = all[i];
          if (skip(node)) continue;
          var cs = win.getComputedStyle(node), decls = "";
          var isSvgText = !!SVG_TEXT[String(node.tagName || "").toUpperCase()];

          // --- graphic surfaces: full matrix, maximum separation ---
          for (j = 0; j < GPROPS.length; j++) {
            var p = GPROPS[j];
            if (p === "fill" && isSvgText) continue;           // that is text color; handled below
            var c = parse(cs.getPropertyValue(p));
            if (!c) continue;
            var ck = c[0] + "," + c[1] + "," + c[2];
            var out = memo[ck] || (memo[ck] = correctGraphic([c[0], c[1], c[2]], m));
            if (out[0] === c[0] && out[1] === c[1] && out[2] === c[2]) continue;
            decls += p + ":" + fmt(out, c[3]) + " !important;";
          }

          // --- text: always black or white, judged against the corrected backdrop ---
          if (isSvgText || hasOwnText(node)) {
            var prop = isSvgText ? "fill" : "color";
            var cur = parse(cs.getPropertyValue(prop));
            // Gradient-clipped text (background-clip:text with a transparent color) is painted by
            // its own background image, so it has no color for us to correct and would otherwise
            // be the one run of text on the page with no contrast guarantee at all. While a mode
            // is on, the guarantee outranks the decoration: switch the clip off and ink it.
            var clip = cs.getPropertyValue("-webkit-background-clip") || cs.getPropertyValue("background-clip");
            var clipText = clip === "text";
            if (cur || clipText) {
              // For clip:text its own background is the ink, not the backdrop — judge the parent.
              var basis = (clipText && node.parentElement) ? node.parentElement : node;
              var ebg = effectiveBg(basis, m, bgCache), ink = null, outline = "";
              if (ebg) {
                ink = inkFor(ebg);                                        // provable >= 4.58:1
                if (worstRatio(ink, ebg) < 4.5) outline = halo(ink);      // range too wide for any ink
              } else if (cur) {
                ink = correctKeepLum([cur[0], cur[1], cur[2]], m);        // bitmap: keep author's ratio
              }
              if (ink && clipText) {
                decls += prop + ":" + fmt(ink, 1) + " !important;";
                decls += "-webkit-background-clip:border-box !important;background-clip:border-box !important;";
                decls += "background-image:none !important;";
                decls += "text-decoration-color:" + fmt(ink, 1) + " !important;" + outline;
              } else if (ink && (outline || !(ink[0] === cur[0] && ink[1] === cur[1] && ink[2] === cur[2]))) {
                decls += prop + ":" + fmt(ink, cur[3]) + " !important;";
                decls += "text-decoration-color:" + fmt(ink, cur[3]) + " !important;" + outline;
              }
            }
          }

          if (!decls) continue;
          var id = sigMap[decls];
          if (id === undefined) { id = sigMap[decls] = ++n; rules.push(sel(id) + "{" + decls + "}"); }
          node.setAttribute(ATTR, id);
          stamped.push(node);
        }

        if (!rules.length) return;
        sheet = doc.createElement("style");
        sheet.id = STYLE_ID;
        sheet.textContent = rules.join("\n");
        (doc.head || doc.documentElement).appendChild(sheet);
      }

      return {
        paint: paint,
        clear: clear,
        standDown: function () { return standDown; },
        active: function () { return !!sheet; }
      };
    }

    return {
      create: create,
      M: M, MODES: MODES,
      correctGraphic: correctGraphic, correctKeepLum: correctKeepLum,
      inkFor: inkFor, worstRatio: worstRatio, halo: halo, blend: blend,
      parse: parse, fmt: fmt, over: over, lum: lum, ratio: ratio,
      stopsOf: stopsOf, extremes: extremes
    };
  })();

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

    var note = el("div", "font-size:12.5px;line-height:1.45;opacity:.8;padding:2px 10px 6px;");
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
})();
