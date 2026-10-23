// On narrow screens the chapter names become a scrolling bar; bring the current one into view.
(function () {
  'use strict';
  function place() {
    var bar = document.querySelector('.index--chapter');
    if (!bar || bar.scrollWidth <= bar.clientWidth + 1) return;
    var current = bar.querySelector('.is-current');
    if (!current) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var prev = current.previousElementSibling;
    if (reduce || !prev) { bar.scrollLeft = current.offsetLeft; return; }
    bar.scrollLeft = prev.offsetLeft;
    requestAnimationFrame(function () { bar.scrollTo({ left: current.offsetLeft, behavior: 'smooth' }); });
  }
  (window.requestIdleCallback || setTimeout)(place);
})();
