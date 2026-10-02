/*! oq-test-guard.js — refuse to let a vision test report a result the correction produced.
    The eye widget (/widget/eye.js) daltonizes the page. That is the point of it everywhere
    EXCEPT here: on a test page it recolors the stimulus before the visitor sees it, so the
    test would be measuring the correction, not their vision.
    This shows a standing banner while any correction mode is active, with a one-click way off.

    Two engines to detect. v2 recolors computed styles and exposes window.OQEye; v1 (and v2's
    fallback path) applies an SVG filter to #oq-a11y-content. Either one invalidates a test.
    No network, no storage of its own. */
(function () {
  "use strict";
  if (window.__oqTestGuard) return;
  window.__oqTestGuard = true;

  var BANNER_ID = "oq-test-guard";

  function wrapper() { return document.getElementById("oq-a11y-content"); }

  function filterOn() {
    var w = wrapper();
    if (!w) return false;
    var f = getComputedStyle(w).filter;
    return !!f && f !== "none";
  }

  function correctionOn() {
    // v2: the widget reports its own state.
    if (window.OQEye && typeof window.OQEye.get === "function" && window.OQEye.get()) return true;
    // v2 CSSOM engine: a generated sheet is present.
    if (document.getElementById("oq-eye-sheet")) return true;
    // v1 / fallback: a filter on the wrapper.
    return filterOn();
  }

  function build() {
    var b = document.createElement("div");
    b.id = BANNER_ID;
    b.setAttribute("role", "status");
    b.style.cssText =
      "background:#F0EDE6;border-left:4px solid #C23410;color:#1A1A1A;" +
      "font-family:'Source Serif 4',Georgia,serif;font-size:15.5px;line-height:1.55;" +
      "padding:13px 16px;margin:0 auto 18px;max-width:820px;border-radius:0 6px 6px 0;" +
      "display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;";
    var t = document.createElement("span");
    t.style.cssText = "flex:1 1 320px;min-width:260px;";
    t.innerHTML = "<strong>Color correction is on.</strong> This test is measuring the correction, " +
      "not your eyes — any result now is meaningless. Turn correction off before testing.";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Turn it off";
    btn.style.cssText =
      "background:#C23410;color:#fff;border:0;border-radius:6px;padding:9px 16px;" +
      "font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;flex:0 0 auto;";
    btn.addEventListener("click", function () {
      if (window.OQEye && typeof window.OQEye.set === "function") {
        window.OQEye.set(null);            // v2: clears the sheet and the stored choice
      } else {
        try { localStorage.removeItem("oq-eye-mode"); } catch (e) {}
        var w = wrapper();
        if (w) w.style.filter = "none";
      }
      sync();
    });
    b.appendChild(t);
    b.appendChild(btn);
    return b;
  }

  function sync() {
    var on = correctionOn();
    var existing = document.getElementById(BANNER_ID);
    if (on && !existing) {
      var main = document.getElementById("main") || document.querySelector("main") || document.body;
      main.insertBefore(build(), main.firstChild);
    } else if (!on && existing) {
      existing.remove();
    }
  }

  function start() {
    sync();
    if (window.MutationObserver) {
      // v2 writes and removes <style id="oq-eye-sheet"> in <head>.
      new MutationObserver(sync).observe(document.head, { childList: true });
      // v1 / fallback flips the filter on the wrapper, which may not exist yet.
      var w = wrapper();
      if (w) new MutationObserver(sync).observe(w, { attributes: true, attributeFilter: ["style", "class"] });
    }
    window.addEventListener("storage", sync);
    // the widget is deferred; catch the case where it mounts after us
    setTimeout(function () {
      sync();
      var w = wrapper();
      if (w && window.MutationObserver) {
        new MutationObserver(sync).observe(w, { attributes: true, attributeFilter: ["style", "class"] });
      }
    }, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
