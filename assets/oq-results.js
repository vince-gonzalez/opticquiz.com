/* ===== OPTICQUIZ — on-device results store ==================================
   File:    /assets/oq-results.js
   Version: v1.0.0

   One small store, two jobs:
     1. the printable clinician report at /report/ needs results from several tests
     2. the colour corrector needs a MEASURED type + severity instead of a guess

   Both were previously impossible because no test on this site persisted anything.

   PRIVACY — the whole point, and the reason this is localStorage and not a server:
     · Nothing here is ever uploaded. There is no network code in this file at all.
     · It lives in the visitor's own browser and they can wipe it with one call.
     · Dates are DAY precision. A timestamp to the second is a fingerprint; a date is
       a fact, and a clinician only ever needs the date.
     · No identifier of any kind is generated. There is no id, no session, no hash.

   HONESTY — the severity number this derives is a fraction of the SCREEN'S OWN scale,
   not a clinical grade. It is labelled that way everywhere it surfaces. A screen cannot
   grade severity properly and cannot separate protan from deutan; the report says so and
   so does the corrector UI.

     OQ.Results.save("d15", { totalError: 42, dominantAxis: "deutan", ... })
     OQ.Results.all()            -> every stored result
     OQ.Results.profile()        -> { type, severity, source, confidence } or null
     OQ.Results.clear()          -> wipe
============================================================================ */
(function (root) {
  "use strict";
  var KEY = "oq-results-v1";
  var OQ = root.OQ = root.OQ || {};

  function today() {
    return new Date().toISOString().slice(0, 10);   // day precision, deliberate
  }

  /* Minimum instrument version whose stored results are still trustworthy. Bump an entry
     here whenever a test changes in a way that shifts its scores; anything older is dropped
     on read rather than left to feed the severity slider and the corrector.

     d15: 2 - until 2026-08-05 the swatches rendered their cap id on the face, and CAPS[] is
     stored in correct hue order, so the sequence could be reconstructed without perceiving
     colour. Every result recorded before that is from an easier test. */
  var MIN_INSTRUMENT = { d15: 2 };

  function read() {
    var empty = { version: 1, tests: {} };
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return empty;
      var d = JSON.parse(raw);
      if (!d || !d.tests) return empty;
      var dropped = false;
      for (var k in MIN_INSTRUMENT) {
        if (!Object.prototype.hasOwnProperty.call(d.tests, k)) continue;
        var rec = d.tests[k];
        if (!rec || !(rec.instrument >= MIN_INSTRUMENT[k])) { delete d.tests[k]; dropped = true; }
      }
      if (dropped) write(d);
      return d;
    } catch (e) {
      return empty;
    }
  }

  function write(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; }
    catch (e) { return false; }        // private mode, quota — never throw at a test page
  }

  /* ---- severity derivation -------------------------------------------------
     Each mapping converts a test's own raw score to 0..1 as a FRACTION OF THAT
     TEST'S SCALE. These are not clinical grades and are not presented as any. The
     `confidence` field is how much weight the report and corrector should give it,
     and it is deliberately low for the plate test, which has only five red-green
     plates — one plate moves the answer a full step.
  --------------------------------------------------------------------------- */
  var DERIVE = {
    // Field names are the ones /color/ actually computes (ctrlOK, rgTotal, rgCorrect,
    // tTotal, tCorrect) — read out of the page rather than assumed.
    color: function (r) {
      if (typeof r.rgCorrect !== "number" || typeof r.rgTotal !== "number") return null;
      if (r.ctrlOK === false) return null;           // control plate missed: the run is void
      var rgMiss = r.rgTotal - r.rgCorrect;
      var tMiss = (r.tTotal || 0) - (r.tCorrect || 0);
      var rg = r.rgTotal ? rgMiss / r.rgTotal : 0;
      var tr = r.tTotal ? tMiss / r.tTotal : 0;
      // A plate screen cannot separate protan from deutan. "red-green" is the honest
      // ceiling of what this instrument can report, and the corrector must not pretend
      // otherwise by silently picking one.
      var type = tr > rg ? "tritan" : (rg > 0 ? "red-green" : null);
      if (!type) return null;
      return { type: type, severity: Math.max(rg, tr), source: "color", confidence: "low",
               basis: rgMiss + " of " + r.rgTotal + " red-green plates missed" +
                      (tMiss ? ", " + tMiss + " of " + r.tTotal + " blue-yellow" : "") };
    },
    d15: function (r) {
      if (typeof r.totalError !== "number") return null;
      var ax = r.dominantAxis;
      if (!ax || ax === "none") return null;
      // Normalised against this test's own observed error range, NOT a clinical TES cut-off.
      // Inventing published thresholds would be exactly the fabrication this project forbids.
      var sev = Math.max(0, Math.min(1, (r.totalError - 12) / 60));
      return { type: ax, severity: sev, source: "d15", confidence: "moderate",
               basis: "D-15 total error " + r.totalError + ", errors cluster on the " + ax + " axis" };
    },
    sat: function (r) {
      if (!r || typeof r.worstAxisThreshold !== "number" || !r.worstAxis) return null;
      return { type: r.worstAxis, severity: Math.max(0, Math.min(1, r.worstAxisThreshold)),
               source: "sat", confidence: "moderate",
               basis: "saturation threshold elevated on the " + r.worstAxis + " axis" };
    }
  };

  // Preference order when several tests disagree: the arrangement test grades finer than
  // a five-plate screen, so it wins. Stated rather than silently averaged, because an
  // average of two different instruments is not a measurement of anything.
  var PRIORITY = ["d15", "sat", "color"];

  OQ.Results = {
    save: function (test, data, instrument) {
      var d = read();
      d.tests[test] = { test: test, date: today(),
                        instrument: instrument || MIN_INSTRUMENT[test] || 1,
                        data: data || {} };
      d.updated = today();
      return write(d);
    },
    get: function (test) { return read().tests[test] || null; },
    all: function () {
      var t = read().tests, out = [];
      for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k)) out.push(t[k]);
      return out.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    },
    /** Best available { type, severity, source, confidence, basis }, or null. */
    profile: function () {
      var t = read().tests;
      for (var i = 0; i < PRIORITY.length; i++) {
        var name = PRIORITY[i], rec = t[name];
        if (rec && DERIVE[name]) {
          var p = DERIVE[name](rec.data);
          if (p) { p.date = rec.date; return p; }
        }
      }
      return null;
    },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
    KEY: KEY
  };
})(typeof window !== "undefined" ? window : this);
