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
    chrome.storage.local.set(makeObj(KEY, val));
    mark(mode);
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0] && tabs[0].id != null) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "oq-mode", mode: val }, function () {
          void chrome.runtime.lastError; // ignore "no receiver" on chrome:// pages
        });
      }
    });
  });
});

function makeObj(k, v) { var o = {}; o[k] = v; return o; }
