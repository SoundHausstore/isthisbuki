(function () {
  'use strict';
  var KEY = 'ib-theme';
  var root = document.documentElement;
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function current() { return root.getAttribute('data-theme') || stored() || (darkQuery.matches ? 'dark' : 'light'); }

  function sync() {
    var theme = current();
    document.querySelectorAll('[data-set-theme]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-set-theme') === theme));
    });
  }

  function set(theme) {
    var value = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', value);
    try { localStorage.setItem(KEY, value); } catch (e) {}
    sync();
    document.dispatchEvent(new CustomEvent('ib:theme', { detail: value }));
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-set-theme]');
    if (btn) set(btn.getAttribute('data-set-theme'));
  });
  darkQuery.addEventListener('change', function () { if (!stored()) sync(); });
  sync();
})();
