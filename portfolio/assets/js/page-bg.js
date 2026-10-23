// Cross-fades a set of full-screen background photographs. Holds on the first with reduced motion.
(function () {
  'use strict';
  var slides = [].slice.call(document.querySelectorAll('.page-bg__slide'));
  if (slides.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var index = 0;
  var HOLD = 6000;

  setInterval(function () {
    if (document.hidden) return;
    slides[index].classList.remove('is-active');
    index = (index + 1) % slides.length;
    slides[index].classList.add('is-active');
  }, HOLD);
})();
