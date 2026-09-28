// Plain text play controls. Local MP3s use <audio>; the ghost-production snippet streams through a
// hidden SoundCloud widget. Only one source plays at a time.
(function () {
  'use strict';
  var players = {};

  function buttonsFor(id) { return document.querySelectorAll('[data-play="' + id + '"]'); }

  function setState(id, playing) {
    buttonsFor(id).forEach(function (btn) {
      btn.textContent = playing ? 'Pause' : (btn.getAttribute('data-label') || 'Play');
      btn.setAttribute('aria-pressed', String(playing));
    });
  }

  function pauseOthers(id) {
    Object.keys(players).forEach(function (key) { if (key !== id) players[key].pause(); });
  }

  function filePlayer(id, src) {
    var audio = new Audio();
    audio.preload = 'none';
    audio.src = src;
    audio.addEventListener('play', function () { setState(id, true); });
    audio.addEventListener('pause', function () { setState(id, false); });
    audio.addEventListener('ended', function () { setState(id, false); });
    return {
      toggle: function () {
        if (audio.paused) {
          pauseOthers(id);
          var p = audio.play();
          if (p && p.catch) p.catch(function () { setState(id, false); });
        } else {
          audio.pause();
        }
      },
      pause: function () { audio.pause(); },
    };
  }

  var scApi = null;
  function loadSoundCloudApi() {
    if (scApi) return scApi;
    scApi = new Promise(function (resolve, reject) {
      if (window.SC && window.SC.Widget) { resolve(window.SC); return; }
      var s = document.createElement('script');
      s.src = 'https://w.soundcloud.com/player/api.js';
      s.async = true;
      s.onload = function () { resolve(window.SC); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return scApi;
  }

  function soundCloudPlayer(id, btn) {
    var fallback = btn.parentNode.querySelector('.sc-fallback');
    var iframe = document.createElement('iframe');
    iframe.title = 'SoundCloud player';
    iframe.setAttribute('allow', 'autoplay; encrypted-media');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;left:-10px;bottom:0;opacity:0;pointer-events:none;border:0;';
    iframe.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent('https://api.soundcloud.com/tracks/' + btn.getAttribute('data-sc-track'))
      + '&secret_token=' + encodeURIComponent(btn.getAttribute('data-sc-secret'))
      + '&auto_play=false&visual=false&show_artwork=false&buying=false&sharing=false&download=false';
    document.body.appendChild(iframe);

    var widget = null, ready = false, playing = false, wantPlay = false;
    function showFallback() { if (fallback) fallback.hidden = false; }

    loadSoundCloudApi().then(function (SC) {
      widget = SC.Widget(iframe);
      widget.bind(SC.Widget.Events.READY, function () { ready = true; if (wantPlay) widget.play(); });
      widget.bind(SC.Widget.Events.PLAY, function () { playing = true; setState(id, true); });
      widget.bind(SC.Widget.Events.PAUSE, function () { playing = false; setState(id, false); });
      widget.bind(SC.Widget.Events.FINISH, function () { playing = false; setState(id, false); });
      widget.bind(SC.Widget.Events.ERROR, showFallback);
    }, showFallback);

    return {
      toggle: function () {
        if (playing) { if (widget) widget.pause(); return; }
        pauseOthers(id);
        wantPlay = true;
        if (widget && ready) widget.play();
        setTimeout(function () { if (!playing) showFallback(); }, 3000);
      },
      pause: function () { wantPlay = false; if (widget && playing) widget.pause(); },
    };
  }

  // Create SoundCloud widgets up front so a click can start playback immediately.
  document.querySelectorAll('[data-play][data-sc-track]').forEach(function (btn) {
    var id = btn.getAttribute('data-play');
    if (!players[id]) players[id] = soundCloudPlayer(id, btn);
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-play]');
    if (!btn) return;
    var id = btn.getAttribute('data-play');
    if (!players[id]) {
      var src = btn.getAttribute('data-src');
      if (!src) return;
      players[id] = filePlayer(id, src);
    }
    players[id].toggle();
  });
})();
