// Reveal wipes for [data-reveal], plus the once-per-session home intro:
// names sit centred as one line, a mask sweeps across them, then each flies to its grid column.
(function () {
  'use strict';
  var root = document.documentElement;
  var SWEEP = 2000, PAUSE = 600, FLIGHT = 1200;

  function reveal() {
    document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach(function (el, i) {
      el.style.setProperty('--rd', (i * 120) + 'ms');
      el.classList.add('is-revealed');
    });
  }
  window.IBReveal = reveal;

  function finishIntro() {
    root.classList.remove('intro-pending');
    try { sessionStorage.setItem('ib-intro', '1'); } catch (e) {}
    reveal();
  }

  function measureSentence(labels) {
    var probe = document.createElement('div');
    probe.className = 'intro-probe';
    probe.setAttribute('aria-hidden', 'true');
    var spans = labels.map(function (label, i) {
      var span = document.createElement('span');
      span.textContent = label.textContent;
      probe.appendChild(span);
      if (i < labels.length - 1) probe.appendChild(document.createTextNode('  '));
      return span;
    });
    document.body.appendChild(probe);
    var rects = spans.map(function (s) { return s.getBoundingClientRect(); });
    probe.remove();
    return rects;
  }

  function animate(nav, labels) {
    var finals = labels.map(function (l) { return l.getBoundingClientRect(); });
    var starts = measureSentence(labels);
    if (starts.some(function (r) { return r.width === 0; })) { finishIntro(); return; }

    labels.forEach(function (label, i) {
      var dx = starts[i].left - finals[i].left;
      var dy = (starts[i].top + starts[i].height / 2) - (finals[i].top + finals[i].height / 2);
      label.style.transition = 'none';
      label.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      label.style.opacity = '1';
    });

    var navLeft = nav.getBoundingClientRect().left;
    var left = Math.min.apply(null, starts.map(function (s) { return s.left; })) - navLeft;
    var right = Math.max.apply(null, starts.map(function (s) { return s.right; })) - navLeft;
    var feather = Math.max(120, (right - left) * 0.22);
    var from = left - feather;

    function mask(x) {
      var g = 'linear-gradient(to right, #000 ' + x + 'px, transparent ' + (x + feather) + 'px)';
      nav.style.webkitMaskImage = g;
      nav.style.maskImage = g;
    }
    mask(from);
    void nav.offsetWidth;

    var t0 = null;
    requestAnimationFrame(function sweep(ts) {
      if (t0 === null) t0 = ts;
      var t = Math.min((ts - t0) / SWEEP, 1);
      mask(from + (right - from) * t);
      if (t < 1) { requestAnimationFrame(sweep); return; }
      nav.style.webkitMaskImage = '';
      nav.style.maskImage = '';
      setTimeout(fly, PAUSE);
    });

    function fly() {
      labels.forEach(function (label) {
        label.style.transition = 'transform ' + FLIGHT + 'ms cubic-bezier(1, 0, 0, 1)';
        label.style.transform = 'translate(0, 0)';
      });
      var done = false;
      function end() {
        if (done) return;
        done = true;
        labels.forEach(function (label) { label.style.transition = ''; label.style.transform = ''; label.style.opacity = ''; });
        finishIntro();
      }
      labels[labels.length - 1].addEventListener('transitionend', end, { once: true });
      setTimeout(end, FLIGHT + 200);
    }
  }

  function run() {
    var nav = document.querySelector('.index--home');
    if (!root.classList.contains('intro-pending') || !nav) { root.classList.remove('intro-pending'); reveal(); return; }
    var labels = [].slice.call(nav.querySelectorAll('.index__label'));
    if (!labels.length) { finishIntro(); return; }
    var started = false;
    function start() { if (started) return; started = true; animate(nav, labels); }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start, start);
      setTimeout(start, 2500);
    } else {
      start();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();

  // Never leave content hidden if anything above fails.
  setTimeout(function () { if (root.classList.contains('intro-pending')) finishIntro(); else reveal(); }, 7000);
})();
