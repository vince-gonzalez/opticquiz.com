/*! OpticQuiz Colorblind Eye v2 — a one-line accessibility widget.
    Drop <script src="https://opticquiz.com/widget/eye.js" defer></script> on any page.
    A floating eye appears; opening it lets a visitor pick a live color CORRECTION for their
    type of color-vision deficiency (or "Recommended" if they don't know which they have).

    It CORRECTS, it does not simulate: the point is to help a colorblind visitor tell colors
    apart, not to show a sighted person what color blindness looks like.

    v2 recolors computed STYLE, not pixels, which means photographs are never touched and
    nothing is filtered, so position:fixed and sticky behave exactly as you wrote them. Text is
    forced to pure black or white against its corrected backdrop, so every text run clears WCAG
    AA by construction (worst case 4.58:1). Everything else takes the full correction. Where
    text sits on a url() bitmap the ratio cannot be proven, so the widget preserves the author's
    own ratio instead of guessing; where the operating system's own contrast setting is active
    it stands down entirely. See widget/engine.js for the reasoning and the measurements, and
    run `node tools/verify-widget.js` to re-check all of it.

    Privacy: no tracking, no network, no identifiers. The visitor's choice lives only in their
    own browser's localStorage. Method: https://doi.org/10.5281/zenodo.21310578 · MIT */
  if (window.__oqEye) return;
  window.__oqEye = true;

  var M = OQ_ENGINE.M, MODES = OQ_ENGINE.MODES;
  var KEY = "oq-eye-mode";
  var SKEY = "oq-eye-strength";
  var engine = OQ_ENGINE.create(window, { styleId: "oq-eye-sheet", attr: "data-oq-c", uiAttr: "data-oq-ui" });

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
  function paint(mode) { engine.paint(mode, readStrength()); }

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
      note.textContent = (engine.standDown() && current)
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
      active: function () { return !!current && engine.active(); },
      standDown: function () { return engine.standDown(); }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
