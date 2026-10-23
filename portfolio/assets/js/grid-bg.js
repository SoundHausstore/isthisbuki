// Horizontal rules drawn at the edges of [data-grid-rule] elements, and a cursor-following reveal of
// the column rules on fine-pointer devices.
(function () {
  'use strict';
  var bg = document.querySelector('.gbg');
  if (!bg) return;
  var rulesEl = bg.querySelector('.gbg__rules');
  var revealEl = bg.querySelector('.gbg__reveal');

  var pool = [];
  var raf = 0;

  function edges() {
    var ys = [];
    document.querySelectorAll('[data-grid-rule]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      var edge = el.getAttribute('data-grid-rule');
      if (edge === 'top' || edge === 'both') ys.push(r.top);
      if (edge === 'bottom' || edge === 'both') ys.push(r.bottom);
    });
    ys.sort(function (a, b) { return a - b; });
    var out = [];
    ys.forEach(function (y) {
      y = Math.round(y * 10) / 10;
      if (!out.length || Math.abs(y - out[out.length - 1]) >= 2) out.push(y);
    });
    return out;
  }

  function render() {
    raf = 0;
    if (!rulesEl) return;
    var ys = edges();
    var i;
    for (i = 0; i < ys.length; i++) {
      var el = pool[i];
      if (!el) { el = document.createElement('div'); el.className = 'gbg__rule'; rulesEl.appendChild(el); pool[i] = el; }
      el.style.top = ys[i] + 'px';
      el.style.display = '';
    }
    for (; i < pool.length; i++) pool[i].style.display = 'none';
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(render); }
  schedule();
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  setTimeout(schedule, 1200);
  setTimeout(schedule, 4500);

  if (!revealEl) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var tx = window.innerWidth / 2, ty = window.innerHeight / 2, cx = tx, cy = ty;
  var running = false;
  var FOLLOW = 0.3;

  function loop() {
    cx += (tx - cx) * FOLLOW;
    cy += (ty - cy) * FOLLOW;
    revealEl.style.setProperty('--mx', cx.toFixed(1) + 'px');
    revealEl.style.setProperty('--my', cy.toFixed(1) + 'px');
    if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) requestAnimationFrame(loop);
    else running = false;
  }

  window.addEventListener('pointermove', function (e) {
    tx = e.clientX;
    ty = e.clientY;
    if (!running) { running = true; requestAnimationFrame(loop); }
  }, { passive: true });
})();
