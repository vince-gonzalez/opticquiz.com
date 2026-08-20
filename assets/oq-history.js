/* OpticQuiz — local-first result history.
 *
 *   oqHistory.enabled()                  is the user keeping history?
 *   oqHistory.enable() / .disable()      turn it on or off (disable also erases)
 *   oqHistory.save("flicker", 27.4, "Hz", "sharp temporal vision")
 *   oqHistory.all()                      every stored entry, newest first
 *   oqHistory.forTest("flicker")         one test's entries
 *   oqHistory.exportJSON()               the whole store as a string, for the user to keep
 *   oqHistory.clear()                    erase everything, keep the setting
 *
 * OPT-IN, AND THAT IS NOT A UX PREFERENCE. /about/ states that test answers and scores are
 * "never uploaded or stored anywhere". Saving results by default would make that sentence false
 * on the user's own machine. So nothing is written until the reader asks for it, and the claim
 * becomes: never uploaded, and stored only on your device, only if you switch this on.
 *
 * localStorage only. No network call exists in this file — there is no fetch, no beacon, no
 * image ping. Grep it. The data cannot leave the device because there is no code here that
 * could send it.
 *
 * A stored entry is a number, a unit, a short band label and a timestamp. It carries no
 * per-question answers: a history of "27.4 Hz on 14 August" is useful to its owner, while a
 * record of which plates someone misread is a medical detail nobody needs to keep.
 */
(function (w) {
  "use strict";

  var FLAG = "oq_history_on";
  var STORE = "oq_history_v1";
  var MAX = 200;                    // per test; oldest dropped first

  // Only these test ids may be stored. The data never leaves the device, so this is not a
  // transmission-injection guard like the analytics allowlist — it is here so a typo'd id
  // cannot create a phantom group, and so the history page never renders an id it did not
  // expect. A test wired to save() under a new id must be added here first.
  var ALLOWED = {
    "flicker": 1, "contrast": 1, "acuity-right": 1, "acuity-left": 1,
    "reaction": 1, "vernier": 1, "sat": 1, "hue": 1, "d15": 1
  };

  function read() {
    try {
      var raw = localStorage.getItem(STORE);
      var v = raw ? JSON.parse(raw) : {};
      return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
    } catch (e) { return {}; }
  }

  function write(obj) {
    try { localStorage.setItem(STORE, JSON.stringify(obj)); return true; }
    catch (e) { return false; }     // quota or private mode: fail quietly, never throw into a test
  }

  function enabled() {
    try { return localStorage.getItem(FLAG) === "1"; } catch (e) { return false; }
  }

  function enable() {
    try { localStorage.setItem(FLAG, "1"); return true; } catch (e) { return false; }
  }

  function disable() {
    // Turning it off erases what was kept. A setting that leaves the data behind is a lie.
    try { localStorage.removeItem(FLAG); localStorage.removeItem(STORE); return true; }
    catch (e) { return false; }
  }

  function save(test, value, unit, band) {
    if (!enabled()) { return false; }
    if (typeof test !== "string" || !ALLOWED[test]) { return false; }
    var n = Number(value);
    if (!isFinite(n)) { return false; }
    var db = read();
    var list = db[test] || [];
    list.push({
      t: Date.now(),
      v: Math.round(n * 1000) / 1000,
      u: typeof unit === "string" ? unit.slice(0, 12) : "",
      b: typeof band === "string" ? band.slice(0, 60) : ""
    });
    if (list.length > MAX) { list = list.slice(list.length - MAX); }
    db[test] = list;
    return write(db);
  }

  function forTest(test) {
    var l = (read()[test] || []).slice();
    l.sort(function (a, b) { return b.t - a.t; });
    return l;
  }

  function all() {
    var db = read(), out = [];
    for (var k in db) {
      if (!Object.prototype.hasOwnProperty.call(db, k)) { continue; }
      for (var i = 0; i < db[k].length; i++) {
        var e = db[k][i];
        out.push({ test: k, t: e.t, v: e.v, u: e.u, b: e.b });
      }
    }
    out.sort(function (a, b) { return b.t - a.t; });
    return out;
  }

  function exportJSON() {
    return JSON.stringify({ store: STORE, exported: new Date().toISOString(),
                            note: "OpticQuiz local history. Never uploaded.",
                            entries: all() }, null, 1);
  }

  function clear() {
    try { localStorage.removeItem(STORE); return true; } catch (e) { return false; }
  }

  w.oqHistory = { enabled: enabled, enable: enable, disable: disable, save: save,
                  forTest: forTest, all: all, exportJSON: exportJSON, clear: clear };
})(window);
