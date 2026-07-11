/* OpticQuiz i18n — client-side instant language toggle. No reload, no separate URLs.
   Load a dictionary file BEFORE this script:
     window.OQ_LANGS = [{code:'en',name:'English'}, ...];
     window.OQ_I18N  = { en:{key:val,...}, es:{...}, ... };
   Mark elements:
     <h1 data-i18n-html="intro.h1"></h1>          (innerHTML — allows <br>)
     <span data-i18n="btn.start"></span>          (textContent)
     <a data-i18n-attr="aria-label:link.home"></a> (attributes; ';'-separated pairs)
   For JS-built strings: OQI18N.t('key'); re-render on the 'oq-lang' window event.
*/
(function () {
  var STORE = "oq_lang";
  var RTL = { ar: 1, he: 1, fa: 1, ur: 1 };
  var DICT = window.OQ_I18N || {};
  var LANGS = window.OQ_LANGS || [];

  function cur() {
    var s = null;
    try { s = localStorage.getItem(STORE); } catch (e) {}
    if (s && DICT[s]) return s;
    var n = (navigator.language || "en").slice(0, 2).toLowerCase();
    return DICT[n] ? n : "en";
  }

  function get(key, lang) {
    var d = DICT[lang] || {}, e = DICT.en || {};
    return (key in d) ? d[key] : (e[key] != null ? e[key] : null);
  }

  function t(key, lang) {
    var v = get(key, lang || cur());
    return v == null ? key : v;
  }

  function apply(lang) {
    lang = lang || cur();
    var i, els;
    els = document.querySelectorAll("[data-i18n]");
    for (i = 0; i < els.length; i++) { var v = get(els[i].getAttribute("data-i18n"), lang); if (v != null) els[i].textContent = v; }
    els = document.querySelectorAll("[data-i18n-html]");
    for (i = 0; i < els.length; i++) { var vh = get(els[i].getAttribute("data-i18n-html"), lang); if (vh != null) els[i].innerHTML = vh; }
    els = document.querySelectorAll("[data-i18n-attr]");
    for (i = 0; i < els.length; i++) {
      var spec = els[i].getAttribute("data-i18n-attr").split(";");
      for (var s = 0; s < spec.length; s++) {
        var p = spec[s].split(":");
        if (p.length === 2) { var va = get(p[1], lang); if (va != null) els[i].setAttribute(p[0].trim(), va); }
      }
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL[lang] ? "rtl" : "ltr";
    try { localStorage.setItem(STORE, lang); } catch (e) {}
    var sel = document.querySelector(".oq-lang-select");
    if (sel && sel.value !== lang) sel.value = lang;
    try { window.dispatchEvent(new CustomEvent("oq-lang", { detail: { lang: lang } })); } catch (e) {}
  }

  function mount(hostSel) {
    var host = document.querySelector(hostSel);
    if (!host || host.querySelector(".oq-lang-select")) return;
    var sel = document.createElement("select");
    sel.className = "oq-lang-select";
    sel.setAttribute("aria-label", "Choose language / idioma / langue");
    for (var i = 0; i < LANGS.length; i++) {
      if (!DICT[LANGS[i].code]) continue;
      var o = document.createElement("option");
      o.value = LANGS[i].code; o.textContent = LANGS[i].name;
      sel.appendChild(o);
    }
    sel.value = cur();
    sel.onchange = function () { apply(sel.value); };
    host.appendChild(sel);
  }

  function injectCSS() {
    if (document.getElementById("oq-i18n-css")) return;
    var st = document.createElement("style");
    st.id = "oq-i18n-css";
    st.textContent = ".oq-lang-select{font-family:'Courier New',monospace;font-size:11px;letter-spacing:.04em;color:#1A1A1A;background:#fff;border:1px solid #D4D0C8;border-radius:20px;padding:5px 26px 5px 10px;cursor:pointer;-webkit-appearance:none;appearance:none;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M0 0l5 6 5-6z' fill='%236B6B6B'/></svg>\");background-repeat:no-repeat;background-position:right 9px center;}.oq-lang-select:focus-visible{outline:3px solid #E8431A;outline-offset:2px;}";
    document.head.appendChild(st);
  }

  function init() {
    injectCSS();
    if (document.querySelector("[data-oq-lang-switcher]")) mount("[data-oq-lang-switcher]");
    apply(cur());
  }

  window.OQI18N = { t: t, apply: apply, cur: cur, mount: mount };
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
