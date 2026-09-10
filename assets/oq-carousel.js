/* oq-carousel.js — progressive enhancement for .oq-carousel.
   The track is a CSS scroll-snap row, so it already scrolls and swipes with JS disabled.
   This adds prev/next buttons, dots, and end-state disabling. No dependencies. */
(function () {
  "use strict";
  function init(root) {
    var track = root.querySelector(".oq-carousel__track");
    var prev = root.querySelector('[data-oq="prev"]');
    var next = root.querySelector('[data-oq="next"]');
    var dotWrap = root.querySelector(".oq-carousel__dots");
    if (!track) return;
    var cards = Array.prototype.slice.call(track.children);
    if (!cards.length) return;

    function step() {
      var a = cards[0].getBoundingClientRect();
      var b = cards[1] ? cards[1].getBoundingClientRect() : null;
      return b ? b.left - a.left : a.width + 18;
    }
    function maxScroll() { return track.scrollWidth - track.clientWidth; }

    if (dotWrap) {
      cards.forEach(function (_, i) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "oq-carousel__dot";
        d.setAttribute("aria-label", "Go to item " + (i + 1));
        d.addEventListener("click", function () { track.scrollTo({ left: i * step(), behavior: "smooth" }); });
        dotWrap.appendChild(d);
      });
    }

    function sync() {
      var x = track.scrollLeft, max = maxScroll();
      if (prev) prev.disabled = x <= 2;
      if (next) next.disabled = x >= max - 2;
      if (dotWrap) {
        var idx = Math.round(x / step());
        Array.prototype.forEach.call(dotWrap.children, function (d, i) {
          if (i === idx) d.setAttribute("aria-current", "true");
          else d.removeAttribute("aria-current");
        });
      }
    }

    if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });
    if (next) next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });

    var raf = 0;
    track.addEventListener("scroll", function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; sync(); });
    }, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll(".oq-carousel"), init);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
