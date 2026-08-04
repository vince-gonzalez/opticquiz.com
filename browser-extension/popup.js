// OpticQuiz Colorblind Corrector — popup.
var KEY = "oq-cx-mode";
var buttons = document.querySelectorAll(".mode");

var ask = document.getElementById("ask");
var SKEY = "oq-cx-strength", PKEY = "oq-cx-profile";
var strWrap = document.getElementById("str"),
    strEl = document.getElementById("strength"),
    strVal = document.getElementById("strval"),
    strNote = document.getElementById("strnote");

function mark(mode) {
  buttons.forEach(function (b) {
    b.setAttribute("aria-checked", b.getAttribute("data-mode") === (mode || "off") ? "true" : "false");
  });
  // Only ask once a correction is actually running. Asking "did this help?" of someone who
  // has not turned it on yet is noise, and noise is what makes people stop reading asks.
  if (ask) ask.hidden = !mode || mode === "off";
  // Strength is meaningless with no correction running.
  if (strWrap) strWrap.hidden = !mode || mode === "off";
}

function showStrength(pct, profile) {
  if (!strEl) return;
  strEl.value = pct;
  strVal.textContent = pct + "%";
  if (profile && profile.severity != null) {
    // Set from the person's own test rather than a guess. The number itself is
    // deliberately not shown - a decimal severity reads as a clinical measurement and
    // it is not one.
    strNote.className = "strnote measured";
    strNote.textContent = "Set from your own test result on opticquiz.com (" +
      profile.type + "). Adjust if it does not look right to you — you are the instrument.";
  } else {
    strNote.className = "strnote";
    strNote.textContent = "Full strength suits complete colour blindness. If your deficiency " +
      "is mild, less is usually better — and distorts far less.";
  }
}

chrome.storage.local.get([KEY, SKEY, PKEY], function (r) {
  mark(r && r[KEY] ? r[KEY] : "off");
  showStrength(r && typeof r[SKEY] === "number" ? r[SKEY] : 100, r && r[PKEY]);
});

if (strEl) {
  strEl.addEventListener("input", function () {
    var v = parseInt(strEl.value, 10);
    strVal.textContent = v + "%";
    chrome.storage.local.set(makeObj(SKEY, v));
  });
}

buttons.forEach(function (b) {
  b.addEventListener("click", function () {
    var mode = b.getAttribute("data-mode");
    var val = mode === "off" ? null : mode;
    // Writing the mode is all that's needed — each page's content script listens
    // for the storage change and re-applies. No tabs permission, no messaging.
    chrome.storage.local.set(makeObj(KEY, val));
    mark(mode);
  });
});

function makeObj(k, v) { var o = {}; o[k] = v; return o; }
