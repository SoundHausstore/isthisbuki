// Hover media on the home line: clips play only while their name is hovered or focused.
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.querySelectorAll('.index--home .index__item').forEach(function (item) {
    var video = item.querySelector('.index__media video');
    var link = item.querySelector('.index__link');
    if (!video || !link) return;
    function play() { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    function stop() { video.pause(); }
    link.addEventListener('mouseenter', play);
    link.addEventListener('mouseleave', stop);
    link.addEventListener('focus', play);
    link.addEventListener('blur', stop);
  });
})();
