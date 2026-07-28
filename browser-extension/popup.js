// OpticQuiz Colorblind Corrector — popup.
var KEY = "oq-cx-mode";
var buttons = document.querySelectorAll(".mode");

function mark(mode) {
  buttons.forEach(function (b) {
    b.setAttribute("aria-checked", b.getAttribute("data-mode") === (mode || "off") ? "true" : "false");
  });
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
