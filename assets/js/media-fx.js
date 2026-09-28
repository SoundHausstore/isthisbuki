// Liquid hover distortion for chapter photos and clips. Each figure gets a WebGL2 canvas on first
// hover: a small height field is stirred by the pointer, and its gradient displaces the image.
// Fine pointers only; skipped entirely with reduced motion.
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var FIELD = 96;
  var MAX_TILES = 10;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  var VERT = '#version 300 es\n' +
    'layout(location=0) in vec2 aPos;\n' +
    'out vec2 vUv;\n' +
    'void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';

  // Diffuse, decay and inject energy at the pointer.
  var STIR = '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D uPrev; uniform vec2 uPointer; uniform float uForce; uniform vec2 uStep;\n' +
    'void main(){\n' +
    '  float here = texture(uPrev, vUv).r;\n' +
    '  float around = (texture(uPrev, vUv + vec2(uStep.x, 0.0)).r + texture(uPrev, vUv - vec2(uStep.x, 0.0)).r\n' +
    '               + texture(uPrev, vUv + vec2(0.0, uStep.y)).r + texture(uPrev, vUv - vec2(0.0, uStep.y)).r) * 0.25;\n' +
    '  float v = mix(here, around, 0.55) * 0.962;\n' +
    '  float d = distance(vUv, uPointer);\n' +
    '  v += exp(-(d * d) / 0.0065) * uForce;\n' +
    '  outColor = vec4(clamp(v, 0.0, 1.0), 0.0, 0.0, 1.0);\n' +
    '}';

  // Sample the media, pushed along the field gradient with a slow ripple on top.
  var PAINT = '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D uMedia; uniform sampler2D uField; uniform vec2 uStep; uniform vec2 uCover; uniform float uTime;\n' +
    'void main(){\n' +
    '  float gx = texture(uField, vUv + vec2(uStep.x, 0.0)).r - texture(uField, vUv - vec2(uStep.x, 0.0)).r;\n' +
    '  float gy = texture(uField, vUv + vec2(0.0, uStep.y)).r - texture(uField, vUv - vec2(0.0, uStep.y)).r;\n' +
    '  float h = texture(uField, vUv).r;\n' +
    '  vec2 ripple = vec2(sin(vUv.y * 11.0 + uTime * 1.4), cos(vUv.x * 9.0 - uTime * 1.2)) * 0.012 * h;\n' +
    '  vec2 edge = smoothstep(0.0, 0.08, vUv) * smoothstep(0.0, 0.08, 1.0 - vUv);\n' +
    '  vec2 uv = vUv - (vec2(gx, gy) * 0.85 + ripple) * edge.x * edge.y;\n' +
    '  uv = (uv - 0.5) * uCover + 0.5;\n' +
    '  outColor = vec4(texture(uMedia, clamp(uv, 0.0, 1.0)).rgb, 1.0);\n' +
    '}';

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function program(gl, frag) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var uniforms = {};
    for (var i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
      var name = gl.getActiveUniform(p, i).name;
      uniforms[name] = gl.getUniformLocation(p, name);
    }
    return { handle: p, u: uniforms };
  }

  function fieldTarget(gl) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FIELD, FIELD, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex: tex, fb: fb };
  }

  function Tile(figure) {
    this.figure = figure;
    this.media = figure.querySelector('img, video');
    this.isVideo = this.media.tagName === 'VIDEO';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'media__fx';
    this.canvas.setAttribute('aria-hidden', 'true');
    figure.appendChild(this.canvas);

    var gl = this.gl = this.canvas.getContext('webgl2', { premultipliedAlpha: false, antialias: false });
    if (!gl) throw new Error('webgl2 unavailable');

    this.stir = program(gl, STIR);
    this.paint = program(gl, PAINT);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.fields = [fieldTarget(gl), fieldTarget(gl)];
    this.read = 0;

    this.mediaTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.mediaTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.uploaded = false;

    this.pointer = [0.5, 0.5];
    this.last = null;
    this.force = 0;
    this.energy = 0;
    this.hovering = false;
    this.raf = 0;
    this.start = performance.now();

    var self = this;
    figure.addEventListener('pointermove', function (e) { self.move(e); });
    figure.addEventListener('pointerleave', function () { self.hovering = false; self.last = null; });
    if (!this.isVideo && !this.media.complete) this.media.addEventListener('load', function () { self.uploaded = false; }, { once: true });
  }

  Tile.prototype.move = function (e) {
    var r = this.figure.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width;
    var y = 1 - (e.clientY - r.top) / r.height;
    if (this.last) {
      var speed = Math.hypot(x - this.last[0], y - this.last[1]);
      this.force = Math.min(0.9, this.force + speed * 14);
    }
    this.last = [x, y];
    this.pointer = [x, y];
    this.enter();
  };

  Tile.prototype.enter = function () {
    this.hovering = true;
    this.figure.classList.add('fx-on');
    if (!this.raf) this.raf = requestAnimationFrame(this.frame.bind(this));
  };

  Tile.prototype.ready = function () {
    var m = this.media;
    return this.isVideo ? m.readyState >= 2 && m.videoWidth > 0 : m.complete && m.naturalWidth > 0;
  };

  Tile.prototype.frame = function (now) {
    this.raf = 0;
    var gl = this.gl;
    if (!this.ready()) { this.raf = requestAnimationFrame(this.frame.bind(this)); return; }

    var w = Math.max(1, Math.round(this.figure.clientWidth * DPR));
    var h = Math.max(1, Math.round(this.figure.clientHeight * DPR));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }

    if (this.isVideo || !this.uploaded) {
      gl.bindTexture(gl.TEXTURE_2D, this.mediaTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.media);
      this.uploaded = true;
    }

    // Stir the field.
    var src = this.fields[this.read], dst = this.fields[1 - this.read];
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(0, 0, FIELD, FIELD);
    gl.useProgram(this.stir.handle);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(this.stir.u.uPrev, 0);
    gl.uniform2f(this.stir.u.uPointer, this.pointer[0], this.pointer[1]);
    gl.uniform1f(this.stir.u.uForce, this.hovering ? this.force : 0);
    gl.uniform2f(this.stir.u.uStep, 1 / FIELD, 1 / FIELD);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.read = 1 - this.read;

    // Paint the media through it.
    var aspect = this.isVideo ? this.media.videoWidth / this.media.videoHeight : this.media.naturalWidth / this.media.naturalHeight;
    var box = w / h;
    var cover = aspect > box ? [box / aspect, 1] : [1, aspect / box];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.paint.handle);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mediaTex);
    gl.uniform1i(this.paint.u.uMedia, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.fields[this.read].tex);
    gl.uniform1i(this.paint.u.uField, 1);
    gl.uniform2f(this.paint.u.uStep, 1 / FIELD, 1 / FIELD);
    gl.uniform2f(this.paint.u.uCover, cover[0], cover[1]);
    gl.uniform1f(this.paint.u.uTime, (now - this.start) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);

    this.energy = this.energy * 0.962 + (this.hovering ? this.force : 0);
    this.force *= 0.8;

    if (this.hovering || this.energy > 0.02) {
      this.raf = requestAnimationFrame(this.frame.bind(this));
    } else {
      this.figure.classList.remove('fx-on');
    }
  };

  Tile.prototype.destroy = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    var lose = this.gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    this.canvas.remove();
    this.figure.classList.remove('fx-on');
  };

  var tiles = new Map();
  var order = [];

  function tileFor(figure) {
    if (tiles.has(figure)) return tiles.get(figure);
    if (!figure.querySelector('img, video')) return null;
    try {
      var tile = new Tile(figure);
      tiles.set(figure, tile);
      order.push(figure);
      if (order.length > MAX_TILES) {
        var oldest = order.shift();
        tiles.get(oldest).destroy();
        tiles.delete(oldest);
      }
      return tile;
    } catch (err) {
      console.warn('[media-fx]', err);
      figure.removeAttribute('data-fx');
      return null;
    }
  }

  document.addEventListener('pointerover', function (e) {
    var figure = e.target.closest && e.target.closest('[data-fx]');
    if (!figure) return;
    var tile = tileFor(figure);
    if (tile) tile.enter();
  }, { passive: true });
})();
