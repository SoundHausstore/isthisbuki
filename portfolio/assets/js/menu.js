(function () {
  'use strict';
  var root = document.documentElement;

  function overlay() { return document.querySelector('[data-menu]'); }
  function trigger() { return document.querySelector('[data-menu-toggle]'); }

  function open() {
    var menu = overlay();
    if (!menu) return;
    var header = document.querySelector('.site-header');
    if (header) root.style.setProperty('--menu-top', Math.round(header.getBoundingClientRect().bottom) + 'px');
    menu.hidden = false;
    root.classList.add('menu-open');
    var t = trigger();
    if (t) { t.setAttribute('aria-expanded', 'true'); t.textContent = 'Close'; }
  }

  function close() {
    var menu = overlay();
    if (!menu) return;
    menu.hidden = true;
    root.classList.remove('menu-open');
    root.style.removeProperty('--menu-top');
    var t = trigger();
    if (t) { t.setAttribute('aria-expanded', 'false'); t.textContent = 'Index'; }
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-menu-toggle]')) {
      e.preventDefault();
      if (root.classList.contains('menu-open')) close(); else open();
      return;
    }
    if (e.target.closest('.menu__item')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) close();
  });
  window.matchMedia('(min-width: 1200px)').addEventListener('change', function (m) { if (m.matches) close(); });
})();
