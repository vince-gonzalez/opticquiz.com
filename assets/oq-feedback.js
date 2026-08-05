/* ===== OPTICQUIZ — "Did this help you?" =====================================
   File:    /assets/oq-feedback.js
   Version: v1.0.0
   Purpose: The single implementation of the consented feedback block. Drop it on any
            surface (a test page, the checker, the extension's options page, the desktop
            app's about screen) and it behaves identically and stores into one archive.

   WHAT IT DOES NOT DO — this is the important part:
     · No fetch happens on page load. Nothing at all is sent unless a person clicks.
     · No cookie. No identifier. No page-view record. No IP is stored server-side.
     · localStorage holds one key ("oq-fb:<surface>") so you aren't asked twice. That
       key never leaves the browser and contains no personal data.
     · Words are published only if the person ticks the consent box AND a human then
       approves the record. Two locks.
     · Every submitter gets a withdraw code that deletes their record forever, with no
       account and no email required.

   USAGE
     <div id="oq-feedback" data-surface="extension" data-version="1.0.1"></div>
     <script src="/assets/oq-feedback.js" defer></script>

   data-surface must be one of the archive's controlled vocabulary:
     vision-test color-test checker palettes contrast-checker live-camera widget
     extension desktop-app vscode api package mcp github-action guide other
============================================================================ */
(function () {
  "use strict";

  // Production talks to the deployed Worker; a local checkout talks to `wrangler dev`.
  // Any surface can override with data-api="…" (the desktop app and extension do).
  var API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "http://127.0.0.1:8787/api/impact"
    : "https://api.opticquiz.com/api/impact";
  var CSS = [
    '.oqfb{font-family:"Source Serif 4",Georgia,serif;background:#fff;border:1.5px solid #D4D0C8;border-radius:8px;padding:16px 18px;margin:26px 0;color:#1A1A1A;}',
    '.oqfb h3{font-family:"Bebas Neue",Impact,fantasy;font-size:20px;letter-spacing:.02em;margin:0 0 4px;font-weight:400;}',
    '.oqfb p{font-size:14px;line-height:1.7;color:#6B6B6B;margin:0 0 10px;}',
    '.oqfb .oqfb-note{font-size:13px;line-height:1.6;}',
    '.oqfb-row{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0;}',
    '.oqfb button{font-family:inherit;font-size:15px;padding:9px 16px;border:1.5px solid #D4D0C8;background:#F8F6F2;color:#1A1A1A;border-radius:4px;cursor:pointer;}',
    '.oqfb button:hover{border-color:#C23410;}',
    '.oqfb button[aria-pressed="true"]{background:#1A1A1A;color:#fff;border-color:#1A1A1A;}',
    '.oqfb .oqfb-send{background:#C23410;color:#fff;border-color:#C23410;font-weight:600;}',
    '.oqfb .oqfb-send:hover{background:#C23410;border-color:#C23410;}',
    '.oqfb .oqfb-send[disabled]{opacity:.55;cursor:default;}',
    '.oqfb label{display:block;font-size:13px;color:#1A1A1A;margin:12px 0 4px;font-weight:600;}',
    '.oqfb textarea,.oqfb input[type=text],.oqfb select{width:100%;font-family:inherit;font-size:15px;padding:9px 10px;border:1.5px solid #D4D0C8;border-radius:4px;background:#fff;color:#1A1A1A;}',
    '.oqfb textarea{min-height:92px;resize:vertical;line-height:1.6;}',
    '.oqfb .oqfb-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 12px;}',
    '@media(max-width:520px){.oqfb .oqfb-grid{grid-template-columns:1fr;}}',
    '.oqfb .oqfb-consent{display:flex;gap:9px;align-items:flex-start;margin:14px 0 0;font-size:13px;line-height:1.6;color:#1A1A1A;font-weight:400;}',
    '.oqfb .oqfb-consent input{margin-top:3px;width:16px;height:16px;flex:0 0 auto;}',
    '.oqfb code{font-family:"Courier New",monospace;font-size:15px;background:#F0EDE6;padding:2px 6px;border-radius:3px;letter-spacing:.06em;}',
    '.oqfb a{color:#C23410;}',
    '.oqfb .oqfb-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;}',
    '.oqfb *:focus-visible{outline:3px solid #C23410;outline-offset:2px;}'
  ].join("");

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function mount(host) {
    var surface = host.getAttribute("data-surface") || "other";
    var version = host.getAttribute("data-version") || "";
    var api = host.getAttribute("data-api") || API;
    var key = "oq-fb:" + surface;

    try { if (localStorage.getItem(key)) return; } catch (e) {}

    if (!document.getElementById("oqfb-css")) {
      var st = el("style", { id: "oqfb-css" });
      st.appendChild(document.createTextNode(CSS));
      document.head.appendChild(st);
    }

    host.className = "oqfb";
    host.innerHTML =
      '<h3>DID THIS HELP YOU?</h3>' +
      '<p>OpticQuiz is free and keeps no analytics on you. The only way it can show that it ' +
      'helps real people is if people say so. One click is enough.</p>' +
      '<div class="oqfb-row" role="group" aria-label="Did this help you?">' +
        '<button type="button" data-h="yes">Yes, it helped</button>' +
        '<button type="button" data-h="partly">Partly</button>' +
        '<button type="button" data-h="no">Not really</button>' +
      '</div>' +
      '<p class="oqfb-note" style="margin-top:10px">Clicking sends one line — your answer and which tool you used. ' +
      'No cookie, no account, no IP stored. <a href="/impact/">See the whole archive and what is kept.</a></p>' +
      '<div class="oqfb-more" hidden></div>' +
      '<div class="oqfb-status" role="status" aria-live="polite"></div>';

    var status = host.querySelector(".oqfb-status");
    var more = host.querySelector(".oqfb-more");
    var chosen = null;

    host.querySelectorAll("button[data-h]").forEach(function (b) {
      b.addEventListener("click", function () {
        chosen = b.getAttribute("data-h");
        host.querySelectorAll("button[data-h]").forEach(function (o) {
          o.setAttribute("aria-pressed", String(o === b));
        });
        openForm();
      });
    });

    function openForm() {
      if (!more.hidden) return;
      more.hidden = false;
      more.innerHTML =
        '<label for="oqfb-story">What happened, in your words? <span style="font-weight:400;color:#6B6B6B">(optional)</span></label>' +
        '<textarea id="oqfb-story" maxlength="2000" placeholder="e.g. I could finally read the red/green status dots in my work dashboard."></textarea>' +
        '<label for="oqfb-ba">What could you not do before, that you can do now? <span style="font-weight:400;color:#6B6B6B">(optional)</span></label>' +
        '<textarea id="oqfb-ba" maxlength="1000" placeholder="Optional. This is the part researchers and standards people actually need."></textarea>' +
        '<div class="oqfb-grid">' +
          '<div><label for="oqfb-type">Your colour vision <span style="font-weight:400;color:#6B6B6B">(optional)</span></label>' +
          '<select id="oqfb-type">' +
            '<option value="undisclosed">Rather not say</option>' +
            '<option value="deutan">Deuteranopia / deutan (green-weak)</option>' +
            '<option value="protan">Protanopia / protan (red-weak)</option>' +
            '<option value="tritan">Tritanopia / tritan (blue-yellow)</option>' +
            '<option value="achroma">Achromatopsia (little or no colour)</option>' +
            '<option value="other">Other</option>' +
            '<option value="unknown">I don\'t know my type</option>' +
            '<option value="none">Normal colour vision</option>' +
          '</select></div>' +
          '<div><label for="oqfb-role">You are a… <span style="font-weight:400;color:#6B6B6B">(optional)</span></label>' +
          '<select id="oqfb-role">' +
            '<option value="">Rather not say</option>' +
            '<option value="person">Just me, using it</option>' +
            '<option value="developer">Developer</option>' +
            '<option value="designer">Designer</option>' +
            '<option value="educator">Teacher / educator</option>' +
            '<option value="parent">Parent</option>' +
            '<option value="clinician">Clinician</option>' +
            '<option value="researcher">Researcher</option>' +
            '<option value="other">Other</option>' +
          '</select></div>' +
        '</div>' +
        '<label for="oqfb-region">Country or region <span style="font-weight:400;color:#6B6B6B">(optional)</span></label>' +
        '<input type="text" id="oqfb-region" maxlength="60" placeholder="e.g. Slovenia, or Ohio, USA">' +
        '<label class="oqfb-consent"><input type="checkbox" id="oqfb-consent">' +
        '<span>Publish my words on the public OpticQuiz impact archive under a ' +
        '<a href="https://creativecommons.org/licenses/by/4.0/" rel="license">CC BY 4.0</a> licence, so researchers ' +
        'and standards bodies can cite it. A human reads it before anything appears. ' +
        '<strong>Leave this unticked and your answer is only ever counted, never quoted.</strong></span></label>' +
        '<label for="oqfb-contact" style="margin-top:12px">Email, only if you want a reply <span style="font-weight:400;color:#6B6B6B">(optional — never published, never mailed to a list)</span></label>' +
        '<input type="text" id="oqfb-contact" maxlength="120" autocomplete="off" placeholder="Optional">' +
        '<div class="oqfb-hp"><label for="oqfb-website">Leave this empty</label><input type="text" id="oqfb-website" tabindex="-1" autocomplete="off"></div>' +
        '<div class="oqfb-row" style="margin-top:14px">' +
          '<button type="button" class="oqfb-send">Send it</button>' +
          '<button type="button" class="oqfb-skip">Just the click, no story</button>' +
        '</div>';

      more.querySelector(".oqfb-send").addEventListener("click", function () { send(false); });
      more.querySelector(".oqfb-skip").addEventListener("click", function () { send(true); });
    }

    function send(minimal) {
      var v = function (id) { var n = document.getElementById(id); return n ? n.value.trim() : ""; };
      var consent = !minimal && !!(document.getElementById("oqfb-consent") || {}).checked;
      var payload = {
        helped: chosen,
        surface: surface,
        version: version || undefined,
        website: minimal ? "" : v("oqfb-website")
      };
      if (!minimal) {
        payload.story = v("oqfb-story") || undefined;
        payload.before_after = v("oqfb-ba") || undefined;
        payload.cvd_type = v("oqfb-type") || undefined;
        payload.role = v("oqfb-role") || undefined;
        payload.region = v("oqfb-region") || undefined;
        payload.contact = v("oqfb-contact") || undefined;
        payload.consent_public = consent;
      }

      var btns = host.querySelectorAll("button");
      btns.forEach(function (b) { b.disabled = true; });
      status.textContent = "Sending…";

      fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.j && res.j.error ? res.j.error : "Could not save that.");
          try { localStorage.setItem(key, "1"); } catch (e) {}
          var j = res.j;
          host.innerHTML =
            '<h3>THANK YOU — IT IS ON THE RECORD</h3>' +
            '<p>' + esc(j.note || "Saved.") + '</p>' +
            '<p class="oqfb-note">Record <code>' + esc(j.id) + '</code> · withdraw code <code>' + esc(j.withdraw_code) + '</code><br>' +
            'Keep that code somewhere. Entering it at <a href="/impact/#withdraw">opticquiz.com/impact</a> deletes your record permanently — no account, no email, no questions. ' +
            'That is what makes this consent and not a testimonial.</p>' +
            '<p class="oqfb-note"><a href="/impact/">See the public archive →</a></p>';
        })
        .catch(function (e) {
          btns.forEach(function (b) { b.disabled = false; });
          status.innerHTML = '<p class="oqfb-note" style="color:#C23410">' + esc(e.message || "Something went wrong.") +
            ' Nothing was saved. You can also just <a href="https://github.com/zengineco/opticquiz.com/issues">open an issue</a>.</p>';
        });
    }
  }

  function init() {
    var hosts = document.querySelectorAll("[data-oq-feedback], #oq-feedback");
    for (var i = 0; i < hosts.length; i++) mount(hosts[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
