/* Accessibility + regression sweep for every page, run from ONE browser tab.
 *
 * Serve the site, open any page on it, and in the console:
 *
 *   fetch('/tools/a11y-sweep.js').then(r=>r.text()).then(eval)
 *   await OQSweep.run()                  // every page, load state
 *   await OQSweep.run({enterTests:true}) // also calls startTest() on each test page
 *   OQSweep.report()                     // summary of the last run
 *
 * Why a file and not a pasted snippet: this is the fourth time this sweep has been written,
 * and each rewrite risked checking something subtly different from the last one. A sweep whose
 * definition drifts cannot tell you whether a page got worse.
 *
 * What it checks per page:
 *   - axe-core, WCAG 2.0/2.1/2.2 A + AA
 *   - click-only controls: a click handler no keyboard can reach or fire
 *   - focus survival: whether the focused element still exists after a re-render
 *   - rendered font sizes below the floor (tools/typefloor.py only sees declarations;
 *     this catches em/rem/% chains that compute small)
 *
 * Load state alone proves little on this site - pages swap screens, and the worst defects
 * found so far were invisible until a test had started. Use enterTests:true.
 */
(function (root) {
  "use strict";

  var TEST_PAGES = ["acuity", "amsler", "anomal", "astig", "blindspot", "color", "color/kids",
    "contrast", "d15", "dominance", "flicker", "hue", "reaction", "sat", "strain", "vernier"];

  var ALL_PAGES = ["/", "about", "checker", "contrast-checker", "extension", "impact", "learn",
    "live", "palettes", "platform", "privacy", "report", "setup", "support", "use-cases",
    "widget"].concat(TEST_PAGES);

  var TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
  var FLOOR_PX = 13;
  var AXE_URL = "/node_modules/axe-core/axe.min.js";

  var axeSrc = null;

  function url(p) { return (p === "/" ? "/" : "/" + p + "/") + "?sweep=" + Math.random(); }

  /* Evict stale shared assets before measuring anything.
   *
   * A cache-buster on the page URL does nothing for the /assets/*.js it pulls in, and the
   * browser will happily serve those from its memory cache across a whole sweep. That means a
   * run can report a rule you edited minutes ago as still holding its old value - which is
   * worse than not running at all, because it looks like a finding. This has produced three
   * false readings on this project already, twice from a service worker and once from the
   * memory cache. Re-fetching with cache:"reload" replaces the entries the iframes will use.
   */
  async function freshenAssets() {
    var dirs = ["/assets/", "/widget/", "/tools/"];
    var seen = {};
    for (var i = 0; i < dirs.length; i++) {
      try {
        var html = await (await fetch(dirs[i], { cache: "reload" })).text();
        var hrefs = html.match(/href="[^"]+\.(?:js|css)"/g) || [];
        for (var j = 0; j < hrefs.length; j++) {
          var file = hrefs[j].slice(6, -1);
          var full = file.charAt(0) === "/" ? file : dirs[i] + file;
          if (seen[full]) continue;
          seen[full] = 1;
          try { await fetch(full, { cache: "reload" }); } catch (e) { /* not fatal */ }
        }
      } catch (e) { /* directory listing unavailable - server without autoindex */ }
    }
    return Object.keys(seen).length;
  }

  function frame(p) {
    return new Promise(function (resolve, reject) {
      var f = document.createElement("iframe");
      f.style.cssText = "position:fixed;left:-9999px;top:0;width:1280px;height:1200px";
      f.src = url(p);
      var timer = setTimeout(function () { f.remove(); reject(new Error("load timeout")); }, 10000);
      f.onload = function () { clearTimeout(timer); resolve(f); };
      document.body.appendChild(f);
    });
  }

  /** Elements with a click handler that no keyboard can reach or fire. */
  function clickOnly(doc) {
    var NATIVE = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/;
    return [].slice.call(doc.querySelectorAll("[onclick]")).filter(function (el) {
      if (NATIVE.test(el.tagName) && !(el.tagName === "A" && !el.hasAttribute("href"))) return false;
      if (el.hasAttribute("onkeydown") || el.hasAttribute("onkeyup") || el.hasAttribute("onkeypress")) return false;
      var ti = el.getAttribute("tabindex");
      return ti === null || +ti < 0;
    }).map(function (el) {
      return el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : "");
    });
  }

  /** Rendered sizes below the floor. Catches em/rem/% chains a static scan cannot see. */
  function tinyText(win, doc) {
    var out = {};
    [].slice.call(doc.querySelectorAll("body *")).forEach(function (el) {
      if (!el.offsetParent && el.tagName !== "BODY") return;         // not rendered
      var t = (el.textContent || "").trim();
      if (!t || el.children.length) return;                          // leaf text only
      var px = parseFloat(win.getComputedStyle(el).fontSize);
      if (px && px < FLOOR_PX) {
        var k = el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : "") + " @" + px + "px";
        out[k] = (out[k] || 0) + 1;
      }
    });
    return Object.keys(out).map(function (k) { return k + " ×" + out[k]; });
  }

  /** Does focus survive a re-render? Only meaningful where a render function exists. */
  function focusSurvives(win, doc) {
    var first = doc.querySelector('[tabindex="0"], button, a[href]');
    if (!first || typeof win.renderSortArea !== "function") return null;
    first.focus();
    var id = doc.activeElement && doc.activeElement.id;
    try { win.renderSortArea(); } catch (e) { return null; }
    var still = doc.activeElement && doc.activeElement !== doc.body;
    return { hadId: id || "(no id)", kept: !!still };
  }

  var api = {
    results: [],

    run: async function (opts) {
      opts = opts || {};
      var pages = opts.pages || ALL_PAGES;
      if (!axeSrc) axeSrc = await (await fetch(AXE_URL)).text();
      api.freshened = opts.skipFreshen ? 0 : await freshenAssets();
      api.results = [];
      for (var i = 0; i < pages.length; i++) {
        var p = pages[i], row = { page: p };
        try {
          var f = await frame(p);
          var w = f.contentWindow, d = f.contentDocument;
          if (opts.enterTests && TEST_PAGES.indexOf(p) !== -1 && typeof w.startTest === "function") {
            try { w.startTest(); row.entered = true; } catch (e) { row.entered = false; }
          }
          await new Promise(function (r) { setTimeout(r, opts.settle || 250); });
          w.eval(axeSrc);
          var r = await w.axe.run(d, { runOnly: { type: "tag", values: TAGS } });
          row.violations = r.violations.map(function (v) { return v.id + " ×" + v.nodes.length; });
          row.passes = r.passes.length;
          row.clickOnly = clickOnly(d);
          row.tiny = tinyText(w, d);
          row.focus = focusSurvives(w, d);
          f.remove();
        } catch (e) {
          row.error = String((e && e.message) || e);
        }
        api.results.push(row);
      }
      return api.report();
    },

    report: function () {
      var bad = api.results.filter(function (r) {
        return r.error || (r.violations && r.violations.length) ||
               (r.clickOnly && r.clickOnly.length) || (r.tiny && r.tiny.length) ||
               (r.focus && r.focus.kept === false);
      });
      return {
        pages: api.results.length,
        clean: api.results.length - bad.length,
        assetsFreshened: api.freshened,
        problems: bad,
      };
    },
  };

  root.OQSweep = api;
})(window);
