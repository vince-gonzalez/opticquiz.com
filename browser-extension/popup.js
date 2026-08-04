// OpticQuiz Colorblind Corrector — popup.
var KEY = "oq-cx-mode";
var buttons = document.querySelectorAll(".mode");

var ask = document.getElementById("ask");

function mark(mode) {
  buttons.forEach(function (b) {
    b.setAttribute("aria-checked", b.getAttribute("data-mode") === (mode || "off") ? "true" : "false");
  });
  // Only ask once a correction is actually running. Asking "did this help?" of someone who
  // has not turned it on yet is noise, and noise is what makes people stop reading asks.
  if (ask) ask.hidden = !mode || mode === "off";
}

chrome.storage.local.get([KEY], function (r) {
  mark(r && r[KEY] ? r[KEY] : "off");
});

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
