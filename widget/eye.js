/*! OpticQuiz Colorblind Eye v2 — a one-line accessibility widget.
    Drop <script src="https://opticquiz.com/widget/eye.js" defer></script> on any page.
    A floating eye appears; opening it lets a visitor pick a live color CORRECTION for their
    type of color-vision deficiency (or "Recommended" if they don't know which they have).

    It CORRECTS, it does not simulate: the point is to help a colorblind visitor tell colors
    apart, not to show a sighted person what color blindness looks like. Daltonization is
    evaluated in linear sRGB from the OpticQuiz Machado simulation plus Fidaner redistribution.
    Method: https://doi.org/10.5281/zenodo.21310578 · MIT

    ------------------------------------------------------------------------------------------
    WHAT v2 DOES DIFFERENTLY, AND WHY

    v1 applied one SVG filter to a wrapper around the whole page. Three consequences, all bad:
    photographs were "corrected" too; a filtered ancestor becomes the containing block for
    position:fixed and sticky descendants, so layouts shifted; and the matrices move lightness,
    which silently wrecked text contrast. Measured on this site's own twelve real text/background
    pairs, the v1 filter pushed EIGHT of them below WCAG AA — worst case 3.22:1 on a pair that
    passes at 4.80:1 uncorrected. An accessibility widget must never do that.

    v2 recolors computed STYLE instead of pixels, and splits colors into two jobs:

      TEXT — forced to pure black or pure white, whichever contrasts better against the
        corrected background behind it. Text carries its meaning in its glyphs, not its hue, so
        there is nothing to recover by tinting it and everything to lose. Choosing the better of
        black and white is worst when the background's relative luminance is Y = 0.179, where
        both tie at 4.58:1 — so EVERY text run is WCAG AA or better BY CONSTRUCTION, not by
        measurement. Most land far higher; pure white or black backgrounds give 21:1.

      GRAPHIC — backgrounds, borders, outlines, SVG fill and stroke get the full matrix, because
        these are the surfaces that actually carry color-coded information and no text-contrast
        rule applies to them. Measured on genuine confusion pairs (near-identical after
        simulation, clearly different to normal vision), the full matrices lift mean CIEDE2000
        from 1.9 to between 10.8 and 21.6, separating 97-100% of them.

    Deliberate consequences:
      • Photographs, video and canvas are untouched — we never read or write raster content.
      • No wrapper and no filter, so position:fixed and sticky behave exactly as authored.
      • Text color is discarded while a mode is on. That is the point: a page that encodes
        meaning in text color alone was never conveying it to this visitor anyway.

    OPERATING-SYSTEM SETTINGS
      • forced-colors: active (Windows Contrast Themes, etc.) — v2 STANDS DOWN and paints
        nothing. The OS is already enforcing a stronger guarantee; overriding it with
        !important would be a regression.
      • prefers-color-scheme — needs no special case. Text color is chosen from the background
        actually rendered, so a dark page gets white text and a light page black.
      • prefers-contrast: more — already satisfied; maximum text contrast is unconditional here.

    KNOWN LIMIT, STATED PLAINLY
      Gradients ARE resolved: each channel moves monotonically between adjacent color stops and
      luminance is a positive-weighted sum of channels, so the stop colors bound the luminance
      of every pixel between them, and the ink is chosen against the extremes. Only a bitmap —
      a url() layer, whose pixels we will not read — leaves the ratio unprovable. There, v2
      does not pretend: it falls back to a luminance-preserving correction of the author's own
      text color, which leaves the contrast ratio exactly as they set it (measured drift
      0.0589:1, which is 8-bit rounding).

      Correction improves color separation. It cannot invent a distinction the display never
      rendered.

    Privacy: no tracking, no network, no identifiers. The visitor's choice lives only in their
    own browser's localStorage. */
(function () {
  "use strict";
  if (window.__oqEye) return;
  window.__oqEye = true;

  /* ---------- matrices ---------- */
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
  var KEY = "oq-eye-mode";
  var SKEY = "oq-eye-strength";

  // Surfaces that carry color-coded information. `fill` is re-routed to text on SVG text.
  var GPROPS = ["background-color", "border-top-color", "border-right-color",
    "border-bottom-color", "border-left-color", "outline-color", "fill", "stroke"];
  var SVG_TEXT = { TEXT: 1, TSPAN: 1, TEXTPATH: 1 };
  var BLACK = [0, 0, 0], WHITE = [255, 255, 255];

  var MAX_ELEMENTS = 9000;     // beyond this, walking costs more than it returns
  var STYLE_ID = "oq-eye-sheet";
  var ATTR = "data-oq-c";

  /* This widget only corrects the page it is installed on. A visitor who needs correction
     needs it everywhere, so the menu offers the extension for the browser they are actually
     using. Absolute URLs: the widget runs on other people's domains. */
  var STORE = {
    chrome:  "https://chromewebstore.google.com/detail/opticquiz-%E2%80%94-colorblind-co/cigfnaekhndlablojacfdhmgcdnnfieo",
    edge:    "https://microsoftedge.microsoft.com/addons/detail/maalcjohefglpnenmfjjkacgmomhofeh",
    firefox: "https://addons.mozilla.org/en-US/firefox/addon/opticquiz-colorblind-corrector/",
    all:     "https://opticquiz.com/extension/"
  };
  /* Order matters: Edge, Opera, Brave and Vivaldi all carry "Chrome/" in their user agent, so
     the specific tokens are tested before the generic one. Chromium forks install from the
     Chrome Web Store, so they are pointed there rather than left without an answer.

     Phones are the case worth getting right. Chrome on Android supports no extensions at all
     and iOS has no equivalent, so sending those visitors to a store would be sending them
     somewhere that cannot help them. Both platforms do ship a system-wide color correction,
     which is the better answer there anyway — so mobile is routed to the system section
     instead. Firefox for Android is the one mobile browser that does take add-ons. */
  function browserTarget() {
    var ua = navigator.userAgent || "";
    var android = /Android/.test(ua), ios = /iPhone|iPad|iPod/.test(ua);
    if (/Firefox\//.test(ua) && !/Seamonkey\//.test(ua)) return { name: "Firefox", url: STORE.firefox };
    if (ios || android) return { mobile: true, url: STORE.all + "#system" };
    if (/Edg\//.test(ua)) return { name: "Edge", url: STORE.edge };
    if (/OPR\//.test(ua)) return { name: "Opera", url: STORE.chrome };
    if (/Chrome\//.test(ua)) return { name: "Chrome", url: STORE.chrome };
    return null;                 // Safari and anything unknown: send them to the page instead
  }

  /* Author stylesheets use !important too, and at specificities we have to beat. This site's
     own `.oq-nav__cta { color:#fff !important }` is specificity (0,1,0) — exactly tying a
     single attribute selector, which left the nav button white on a light corrected background
     at 3.42:1. Repeating the attribute lifts us to (0,3,0) without changing what we match, so
     a correction cannot be silently overridden by a rule the page author never wrote with us
     in mind. Repeated three times, not more: enough to clear ordinary author rules, still
     cheap to match, and still losing to a visitor's own user stylesheet, which should win. */
  function sel(id) {
    var a = "[" + ATTR + '="' + id + '"]';
    return a + a + a;
  }

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
  // Luminance-preserving. Only used for text whose background cannot be determined, so the
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
  /* The rule: text is always black or white. Pick whichever reads better against EVERY
     backdrop the text might sit on, judging each candidate by its worst case. For one solid
     color the worst case is a background at Y = 0.179, where black and white tie at 4.58:1,
     so this never returns below AA. */
  function worstRatio(ink, bgs) {
    var w = Infinity;
    for (var i = 0; i < bgs.length; i++) w = Math.min(w, ratio(ink, bgs[i]));
    return w;
  }
  function inkFor(bgs) {
    return worstRatio(BLACK, bgs) >= worstRatio(WHITE, bgs) ? BLACK : WHITE;
  }
  /* A backdrop that genuinely spans dark to light — a gradient running white to near-black —
     admits no single ink above AA: whichever we pick, the other end of the range fails. Rather
     than quietly ship a 1.14:1 run of text, we ink for the better worst case and outline the
     glyphs in the opposite tone, so the glyph edge contrasts wherever it happens to land. The
     guarantee there rests on the outline rather than on the fill ratio, which is worth saying
     out loud rather than burying. */
  function halo(ink) {
    var o = (ink === BLACK ? "255,255,255" : "0,0,0");
    return "text-shadow:0 0 2px rgb(" + o + "),0 0 2px rgb(" + o + "),0 0 4px rgb(" + o + ") !important;";
  }

  /* A gradient is not unknowable. Each channel moves monotonically between adjacent color
     stops, and relative luminance is a positive-weighted sum of channels, so the luminance
     anywhere along the gradient is bounded by the luminances AT the stops. Collecting the
     stop colors and judging the ink against all of them therefore covers every pixel under
     the text. A url() layer is a real image and stays genuinely unresolvable. */
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
  function forcedColors() {
    return !!(window.matchMedia && window.matchMedia("(forced-colors: active)").matches);
  }

  /* ---------- the engine ---------- */
  var sheet = null, stamped = [], standDown = false;

  function skip(node) {
    if (node.nodeType !== 1) return true;
    var t = String(node.tagName || "").toUpperCase();     // HTML is upper case, SVG is mixed
    if (t === "SCRIPT" || t === "STYLE" || t === "LINK" || t === "META" || t === "TITLE") return true;
    if (t === "IMG" || t === "VIDEO" || t === "CANVAS" || t === "PICTURE" || t === "IFRAME") return true;
    if (t === "DEFS" || t === "FILTER" || t === "FECOLORMATRIX") return true;
    return node.closest ? !!node.closest("[data-oq-ui]") : false;   // never recolor our own UI
  }
  function hasOwnText(node) {
    for (var i = 0, c = node.childNodes; i < c.length; i++)
      if (c[i].nodeType === 3 && /\S/.test(c[i].nodeValue)) return true;
    return false;
  }

  /* The background actually rendered behind an element, as it will look AFTER correction.
     Walks to the root compositing backgrounds, and returns the LIST of backdrops the text may
     sit on — one entry for a solid fill, two (the luminance extremes) under a gradient. Returns
     null only when a url() bitmap makes the result genuinely unknowable, because we would
     rather fall back than guess at a contrast ratio.

     The cache is a WeakMap keyed on the elements themselves. An earlier draft kept an id on
     each element and looked it up in a per-repaint object; the ids outlived the counter, so
     repeated repaints handed one element another's background. Keying on identity cannot
     collide by construction. */
  function effectiveBg(node, m, cache) {
    var chain = [], n = node, seed;
    while (n && n.nodeType === 1) {
      if (cache.has(n)) { seed = cache.get(n); break; }
      chain.push(n);
      n = n.parentElement;
    }
    var unknown = seed === false;
    var acc = (seed === undefined || seed === false) ? [WHITE] : seed;  // the canvas is white unless painted
    for (var i = chain.length - 1; i >= 0; i--) {
      var e = chain[i], cs = window.getComputedStyle(e);
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

  function paint(mode) {
    clear();
    if (!mode || !M[mode]) { standDown = false; return; }
    if (forcedColors()) { standDown = true; return; }      // the OS already wins; do not fight it

    var strength = Math.max(0, Math.min(100, readStrength()));
    if (strength === 0) { standDown = false; return; }     // 0% means off, exactly
    var m = blend(M[mode], strength / 100);

    var all = document.body.getElementsByTagName("*");
    if (all.length > MAX_ELEMENTS) { standDown = true; return; }
    standDown = false;

    var rules = [], sigMap = {}, memo = {}, bgCache = new WeakMap(), n = 0, i, j;
    for (i = 0; i < all.length; i++) {
      var node = all[i];
      if (skip(node)) continue;
      var cs = window.getComputedStyle(node), decls = "";
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

      // --- text: always black or white, judged against the corrected background ---
      if (isSvgText || hasOwnText(node)) {
        var prop = isSvgText ? "fill" : "color";
        var cur = parse(cs.getPropertyValue(prop));
        // Gradient-clipped text (background-clip:text with a transparent color) is painted by
        // its own background image, so it has no color for us to correct and would otherwise
        // be the one run of text on the page with no contrast guarantee at all. While a mode is
        // on, the guarantee outranks the decoration: we switch the clip off and ink it.
        var clip = cs.getPropertyValue("-webkit-background-clip") || cs.getPropertyValue("background-clip");
        var clipText = clip === "text";
        if (cur || clipText) {
          // For clip:text its own background is the ink, not the backdrop — judge against the parent.
          var basis = (clipText && node.parentElement) ? node.parentElement : node;
          var ebg = effectiveBg(basis, m, bgCache), ink = null, outline = "";
          if (ebg) {
            ink = inkFor(ebg);                                            // provable >= 4.58:1
            if (worstRatio(ink, ebg) < 4.5) outline = halo(ink);          // range too wide for any ink
          } else if (cur) {
            ink = correctKeepLum([cur[0], cur[1], cur[2]], m);            // bitmap: keep author's ratio
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
    sheet = el("style", null, { id: STYLE_ID });
    sheet.textContent = rules.join("\n");
    document.head.appendChild(sheet);
  }

  function clear() {
    if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
    sheet = null;
    for (var i = 0; i < stamped.length; i++) stamped[i].removeAttribute(ATTR);
    stamped = [];
  }

  /* ---------- widget ---------- */
  function start() {
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

    var current = null, items = [];
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
      clearTimeout(strT); strT = setTimeout(function () { paint(current); syncNote(); }, 90);
    });
    strRow.appendChild(strLab); strRow.appendChild(strIn);
    menu.appendChild(strRow);

    var note = el("div", "font-size:12.5px;line-height:1.45;opacity:.8;padding:2px 10px 6px;");
    menu.appendChild(note);

    // This page is corrected; the rest of the web is not. Offer the extension for the browser
    // they are actually in, and fall back to the page listing every option.
    var tgt = browserTarget();
    var getIt = el("a",
      "display:flex;align-items:center;gap:8px;margin:6px 4px 2px;padding:9px 10px;border-radius:8px;background:rgba(255,255,255,.08);color:#fff;text-decoration:none;font-size:13.5px;line-height:1.3;",
      { href: tgt ? tgt.url : STORE.all, target: "_blank", rel: "noopener" });
    var getLabel = tgt
      ? (tgt.mobile ? "Correct <strong>every app</strong> on this device"
                    : "Add to " + tgt.name + " — correct <strong>every</strong> site")
      : "Get it for your browser — every site";
    getIt.innerHTML = "<span aria-hidden='true' style='font-size:15px;'>" +
      (tgt && tgt.mobile ? "⚙️" : "🧩") + "</span><span>" + getLabel + "</span>";
    getIt.addEventListener("mouseenter", function () { getIt.style.background = "rgba(255,255,255,.16)"; });
    getIt.addEventListener("mouseleave", function () { getIt.style.background = "rgba(255,255,255,.08)"; });
    menu.appendChild(getIt);

    var links = el("div", "display:flex;gap:14px;flex-wrap:wrap;padding:4px 10px 4px;");
    var foot = el("a", "font-size:12.5px;color:#9cc4fb;text-decoration:none;",
      { href: "https://opticquiz.com/methodology/", target: "_blank", rel: "noopener" });
    foot.textContent = "How this works →";
    var sysLink = el("a", "font-size:12.5px;color:#9cc4fb;text-decoration:none;",
      { href: STORE.all + "#system", target: "_blank", rel: "noopener" });
    sysLink.textContent = "System-wide →";
    links.appendChild(foot); links.appendChild(sysLink);
    menu.appendChild(links);

    function syncNote() {
      note.textContent = (standDown && current)
        ? "Your system's own contrast settings are active, so they are left in charge."
        : "Text is set to black or white for maximum contrast. Photos are never altered.";
    }

    function apply(mode) {
      current = mode;
      paint(mode);
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

    // Content rendered after activation (results panels, lazy sections) needs correcting too.
    var pending = false;
    if (window.MutationObserver) {
      new MutationObserver(function (recs) {
        if (!current || pending) return;
        for (var i = 0; i < recs.length; i++) if (recs[i].addedNodes.length) {
          pending = true;
          setTimeout(function () { pending = false; paint(current); }, 120);
          return;
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
    // If the OS contrast setting changes while a mode is on, re-decide.
    if (window.matchMedia) {
      var mq = window.matchMedia("(forced-colors: active)");
      if (mq.addEventListener) mq.addEventListener("change", function () { paint(current); syncNote(); });
    }

    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    apply(saved && M[saved] ? saved : null);

    window.OQEye = {
      set: apply,
      get: function () { return current; },
      active: function () { return !!current && !standDown && !!sheet; },
      standDown: function () { return standDown; }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
