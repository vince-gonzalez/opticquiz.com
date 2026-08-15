/* OpticQuiz — test lifecycle events.
 *
 *   oqTrack("test_start", "flicker");
 *   oqTrack("test_complete", "flicker");
 *
 * WHY THIS FILE IS SHAPED LIKE THIS. /about/ states: "your test answers and scores are never
 * uploaded or stored anywhere." That sentence is the site's credibility, and it is currently
 * true — Google Analytics receives page views, not results. It would stop being true the moment
 * an event carried a score, a threshold, a severity band or an answer.
 *
 * So this module cannot send one. The only payload it will emit is which test fired, taken from
 * a fixed list below, plus the page language. Anything else passed in is DROPPED, not sanitised
 * and not trusted to be harmless — a value cannot leak if the code has no path to send it.
 *
 * What that costs: no funnel by score, no "which result band shares most". What it buys: the
 * completion rate, which is the number actually missing, and a privacy claim that survives
 * someone checking it.
 *
 * Silent no-op when gtag is absent, so a blocked or failed analytics load never breaks a test.
 */
(function (w) {
  "use strict";

  // The only tests allowed to report. An unknown id is dropped rather than passed through,
  // so a typo or an injected string cannot become a dimension.
  var TESTS = {
    acuity: 1, anomal: 1, astig: 1, amsler: 1, blindspot: 1, checker: 1, color: 1,
    "color-kids": 1, contrast: 1, d15: 1, dominance: 1, flicker: 1, hue: 1, reaction: 1,
    sat: 1, strain: 1, vernier: 1
  };

  var EVENTS = { test_start: 1, test_complete: 1 };

  function oqTrack(event, test) {
    try {
      if (!EVENTS[event]) { return false; }
      if (!TESTS[test]) { return false; }
      if (typeof w.gtag !== "function") { return false; }
      // Exactly two parameters. There is deliberately no third argument to this function.
      w.gtag("event", event, {
        test_id: test,
        page_language: (document.documentElement.getAttribute("lang") || "en").slice(0, 5)
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  w.oqTrack = oqTrack;
})(window);
