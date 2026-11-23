// ── Portals ──
// A glowing swirling orb. Used as the Poems / Diary doors on the writings page,
// and as the transition when you step through one: the portal opens over the
// screen, the next page (or the reading view) is swapped in behind it, and the
// portal closes again to reveal it.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KEY = "portalArrive";

  // spiral arms: a few soft logarithmic-spiral strokes that turn around the centre
  var SWIRL = (function () {
    var d = "";
    for (var arm = 0; arm < 4; arm++) {
      var pts = [];
      for (var t = 0; t <= 1.0001; t += 0.04) {
        var ang = arm * Math.PI / 2 + t * 4.2;
        var r = 6 + 40 * Math.pow(t, 0.8);
        pts.push((50 + r * Math.cos(ang)).toFixed(2) + " " + (50 + r * Math.sin(ang)).toFixed(2));
      }
      d += '<path d="M' + pts.join(" L") + '" stroke="' + (arm % 2 ? "#ffeeb0" : "#b8ffe0") + '" stroke-opacity="' + (arm % 2 ? ".7" : ".85") + '"/>';
    }
    return '<svg class="p-spiral" viewBox="0 0 100 100"><g fill="none" stroke-linecap="round" stroke-width="2.6">' + d + '</g></svg>';
  })();


  // ── WebGL vortex ──
  // A real shader: a glowing, turbulent tunnel that spirals down into a point of
  // light, with a flickering rim and sparks pulled inwards. Falls back to the CSS
  // portal below when WebGL isn't available.
  var FRAG = [
    "precision highp float;",
    "uniform vec2 uC; uniform float uR, uT, uB, uA, uS;",
    "float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);",
    "  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }",
    "float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * n2(p); p = p*2.03 + 7.1; a *= 0.5; } return v; }",
    "float fbm3(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * n2(p); p = p*2.03 + 7.1; a *= 0.5; } return v; }",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - uC) / uR;",
    "  float d = length(p), ang = atan(p.y, p.x);",
    "  float edge = 1.0 + 0.006*sin(ang*3.0 + uT*0.5) + 0.010*n2(vec2(cos(ang), sin(ang))*1.6 + uT*0.15);",
    "  float rr = d / edge;",
    "  vec3 col = vec3(0.0); float a = 0.0;",
    "  if (rr < 1.45) {",
    "    float sp = ang + 3.4*log(rr + 0.06) - uT*0.45*uS;",
    "    vec2 dir = vec2(cos(sp), sin(sp));",
    "    vec2 q = dir*2.2 + vec2(rr*2.4, uT*0.12);",
    "    float n = fbm(q + 0.8*vec2(fbm3(q + 3.1), fbm3(q + 6.7)));",
    "    float wob = (n - 0.5) * 1.3;",
    "    float arm1 = pow(0.5 + 0.5*sin(3.0*sp + wob), 3.0);",
    "    float arm2 = pow(0.5 + 0.5*sin(3.0*sp + 2.1 + wob*1.4), 5.0);",
    "    float arm3 = pow(0.5 + 0.5*sin(6.0*sp + 1.0 + wob*2.0), 6.0);",
    "    vec3 deep = vec3(0.006, 0.022, 0.018), sage = vec3(0.17, 0.27, 0.22), pearl = vec3(0.97, 0.95, 0.88), gold = vec3(0.96, 0.78, 0.44), lilac = vec3(0.62, 0.56, 0.78);",
    "    col = mix(deep, sage, smoothstep(0.2, 0.7, n)*0.9);",
    "    col = mix(col, lilac*0.5, (1.0 - arm1) * smoothstep(0.5, 0.8, n) * 0.35);",
    "    float fade = smoothstep(0.03, 0.55, rr);",
    "    col += pearl * arm1 * (0.35 + 0.55*n) * fade;",
    "    col += gold * arm2 * (0.45 + 0.5*n) * (0.4 + 0.6*fade);",
    "    col += pearl * arm3 * 0.35 * fade * n;",
    "    col *= 0.12 + 0.88*smoothstep(0.0, 0.5, rr);",
    "    col += vec3(1.0, 0.97, 0.9) * exp(-rr*rr*420.0) * 1.7;",
    "    col += gold * exp(-rr*rr*60.0) * 0.18;",
    "    float en = fbm3(vec2(cos(sp), sin(sp))*1.7 + vec2(rr*1.6, uT*0.12));",
    "    float mist = exp(-pow((rr - 0.88)/0.28, 2.0));",
    "    col += mix(pearl, gold, 0.3) * mist * (0.12 + 0.3*en);",
    "    col *= 1.0 + 0.2*uB;",
    "    a = 1.0 - smoothstep(0.55, 1.18, rr + (en - 0.5)*0.6);",
    "    a *= a;",
    "  }",
    "  float g = exp(-max(rr - 0.9, 0.0) * 3.2) * 0.12 * (1.0 + 0.5*uB);",
    "  g *= 0.5 + 0.9*n2(vec2(cos(ang), sin(ang))*1.8 + uT*0.2);",
    "  vec3 gc = vec3(0.95, 0.88, 0.72) * g * 0.7;",
    "  if (d < 1.4) for (int i = 0; i < 9; i++) {",
    "    float fi = float(i);",
    "    float s1 = h(vec2(fi, 3.1)), s2 = h(vec2(fi, 9.7));",
    "    float life = fract(uT*(0.10 + 0.12*s2)*uS + s1);",
    "    float r = 1.12 - life*1.12;",
    "    float an = s1*6.2831 + life*3.2 + uT*0.2;",
    "    vec2 sp = vec2(cos(an), sin(an)) * r;",
    "    float dd = length(p - sp);",
    "    gc += vec3(1.0, 0.95, 0.85) * (0.0009 / (dd*dd + 0.0007)) * smoothstep(0.0, 0.2, life) * (1.0 - smoothstep(0.8, 1.0, life)) * 0.55;",
    "  }",
    "  float al = max(a, clamp(max(gc.g, gc.r), 0.0, 1.0));",
    "  vec3 outc = col * a + gc * (1.0 - a);",
    "  gl_FragColor = vec4(outc, al) * uA;",
    "}"
  ].join("\n");
  var VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

  function makeGL(canvas) {
    var gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return null;
    function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ["uC", "uR", "uT", "uB", "uA", "uS"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    var t0 = Math.random() * 50;
    return {
      draw: function (cx, cy, r, t, bright, alpha, speed) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(U.uC, cx, cy); gl.uniform1f(U.uR, r); gl.uniform1f(U.uT, t + t0);
        gl.uniform1f(U.uB, bright); gl.uniform1f(U.uA, alpha); gl.uniform1f(U.uS, speed);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      lose: function () { var e = gl.getExtension("WEBGL_lose_context"); if (e) e.loseContext(); }
    };
  }

  // living orbs on the page, all driven by one animation loop
  var orbs = [];
  var lastOrb = 0;
  function orbLoop(now) {
    if (orbs.length) requestAnimationFrame(orbLoop);
    if (document.hidden || now - lastOrb < 33) return;
    var dt = Math.min((now - (lastOrb || now - 33)) / 1000, 0.06);
    lastOrb = now;
    orbs.forEach(function (o) {
      if (!o.vis) return;
      o.b += ((o.hover ? 1 : 0) - o.b) * 0.15;
      o.s += ((o.hover ? 2.3 : 1) - o.s) * 0.1;
      o.tt += dt * 0.96 * o.s;
      o.g.draw(o.cv.width / 2, o.cv.height / 2, o.cv.width * 0.3, o.tt, o.b, 1, 1);
    });
  }
  function glOrb(host) {
    var size = host.querySelector(".orb-art").getBoundingClientRect().width || 200;
    var cv = document.createElement("canvas");
    var dpr = Math.min(window.devicePixelRatio || 1, 1.25) * 0.8;
    var S = Math.round(size * 1.7);
    cv.width = Math.round(S * dpr); cv.height = Math.round(S * dpr);
    cv.style.cssText = "width:" + S + "px;height:" + S + "px;margin:" + (-(S - size) / 2) + "px;display:block;pointer-events:none;position:relative;";
    var g = makeGL(cv);
    if (!g) return false;
    var o = { cv: cv, g: g, hover: false, b: 0, s: 1, tt: 0, vis: true };
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { o.vis = en[0].isIntersecting; }).observe(host);
    var wrap = host.querySelector(".orb-art");
    wrap.appendChild(cv);
    var a = host;
    a.addEventListener("pointerenter", function () { o.hover = true; });
    a.addEventListener("pointerleave", function () { o.hover = false; });
    a.addEventListener("focus", function () { o.hover = true; });
    a.addEventListener("blur", function () { o.hover = false; });
    orbs.push(o);
    if (orbs.length === 1) requestAnimationFrame(orbLoop);
    return true;
  }

  // full-screen portal: radius r(t) grows from the click until it swallows the screen.
  // It is drawn at reduced resolution (the soft look hides it) and the two WebGL contexts are
  // built once and reused, so opening a portal never has to compile the shader mid-animation.
  var fsPool = [], fsNext = 0;
  function fsScale() { return Math.min(window.devicePixelRatio || 1, 1) * 0.5; }
  function fsGet() {
    var i = fsNext; fsNext = 1 - fsNext;
    if (!fsPool[i]) {
      var cv = document.createElement("canvas");
      cv.className = "portal-gl";
      var g = makeGL(cv);
      if (!g) return null;
      g.lose = function () {};
      fsPool[i] = { cv: cv, g: g };
    }
    return fsPool[i];
  }
  function fullscreen(cx, cy, from, to, ms, ease, alphaFrom, alphaTo, done) {
    var e0 = fsGet();
    if (!e0) return null;
    var cv = e0.cv, g = e0.g, sc = fsScale();
    cv.width = Math.max(Math.round(window.innerWidth * sc), 2); cv.height = Math.max(Math.round(window.innerHeight * sc), 2);
    document.body.appendChild(cv);
    var start = performance.now(), T = 0;
    (function frame(now) {
      var k = Math.min((now - start) / ms, 1), e = ease(k);
      var r = (from + (to - from) * e) * sc;
      T += 0.016 * (1.5 + 3 * Math.sin(Math.PI * k));
      g.draw(cx * sc, (window.innerHeight - cy) * sc, Math.max(r, 1), T, 0.6 * (1 - k * 0.5), alphaFrom + (alphaTo - alphaFrom) * k, 2.2);
      if (k < 1) requestAnimationFrame(frame);
      else { done && done(cv, g); }
    })(start);
    return cv;
  }
  var easeIn = function (k) { return k * k * (3 - 2 * k) * 0.3 + Math.pow(k, 3) * 0.7; };
  var easeOut = function (k) { return 1 - Math.pow(1 - k, 3); };

  function make() {
    var p = document.createElement("div");
    p.className = "portal";
    p.setAttribute("aria-hidden", "true");
    p.innerHTML =
      '<i class="p-glow"></i><i class="p-core"></i>' + SWIRL + SWIRL.replace("p-spiral", "p-spiral b") +
      '<i class="p-ring"></i><i class="p-ring b"></i>' +
      '<i class="p-orbit"><b></b></i><i class="p-orbit o2"><b></b></i><i class="p-orbit o3"><b></b></i>';
    return p;
  }

  // portal fills the screen starting from (x, y); `swap` runs while the screen is covered
  function through(x, y, swap, after) {
    if (reduce) { swap(); if (after) after(); return; }
    var vw = window.innerWidth, vh = window.innerHeight;
    var reach = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y)) * 1.35;
    var cvOpen = fullscreen(x, y, 8, reach, 950, easeIn, 0.2, 1, function (cv, g) {
      swap();
      fullscreen(x, y, reach, reach * 1.6, 700, easeOut, 1, 0, function (cv2, g2) { cv2.remove(); g2.lose(); if (after) after(); });
      cv.remove(); g.lose();
    });
    if (cvOpen) return;
    var fx = document.createElement("div");
    fx.className = "portal-fx";
    var p = make();
    p.style.setProperty("--s", "200px");
    p.style.left = x + "px"; p.style.top = y + "px";
    var veil = document.createElement("div"); veil.className = "portal-veil";
    fx.appendChild(veil); fx.appendChild(p);
    document.body.appendChild(fx);

    var far = Math.max(Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y)) * 2 / 200 * 1.25, 6);
    var open = p.animate(
      [{ transform: "translate(-50%,-50%) scale(0.05) rotate(0deg)", opacity: 0 },
       { transform: "translate(-50%,-50%) scale(0.6) rotate(90deg)", opacity: 1, offset: 0.25 },
       { transform: "translate(-50%,-50%) scale(" + far + ") rotate(260deg)", opacity: 1 }],
      { duration: 900, easing: "cubic-bezier(.55,.05,.35,1)", fill: "forwards" });
    veil.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }],
      { duration: 900, fill: "forwards" });
    open.onfinish = function () {
      swap();
      var close = fx.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, delay: 120, fill: "forwards", easing: "ease-in" });
      p.animate([{ transform: "translate(-50%,-50%) scale(" + far + ") rotate(260deg)" },
                 { transform: "translate(-50%,-50%) scale(" + far * 1.25 + ") rotate(330deg)" }],
        { duration: 770, fill: "forwards" });
      close.onfinish = function () { fx.remove(); if (after) after(); };
    };
  }

  // page arrival: the veil is already up (see the class set below), melt it away
  function arrive() {
    var reach = Math.hypot(window.innerWidth, window.innerHeight) * 0.9;
    var c = fullscreen(window.innerWidth / 2, window.innerHeight / 2, reach, reach * 1.7, 900, easeOut, 1, 0, function (cv, g) { cv.remove(); g.lose(); });
    if (c) { document.documentElement.classList.remove("portal-arriving"); return; }
    var fx = document.createElement("div");
    fx.className = "portal-fx";
    var veil = document.createElement("div"); veil.className = "portal-veil"; veil.style.opacity = 1;
    var p = make(); p.style.setProperty("--s", "200px");
    p.style.left = "50%"; p.style.top = "50%";
    var big = Math.max(window.innerWidth, window.innerHeight) / 200 * 2.2;
    p.style.transform = "translate(-50%,-50%) scale(" + big + ")";
    fx.appendChild(veil); fx.appendChild(p);
    document.body.appendChild(fx);
    document.documentElement.classList.remove("portal-arriving");
    p.animate([{ transform: "translate(-50%,-50%) scale(" + big + ") rotate(0deg)", opacity: 1 },
               { transform: "translate(-50%,-50%) scale(0.05) rotate(-200deg)", opacity: 0 }],
      { duration: 1000, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
    veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 800, easing: "ease-out", fill: "forwards" });
    setTimeout(function () { fx.remove(); }, 1050);
  }

  window.Portal = { make: make, through: through };

  // build the full-screen portals once the page is idle so the first click is instant
  window.addEventListener("load", function () {
    if (reduce) return;
    setTimeout(function () { fsGet(); fsGet(); }, 900);
  });

  // orbs on the writings page + links that should open a portal
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-portal-orb]").forEach(function (host) {
      var art = document.createElement("span"); art.className = "orb-art";
      host.insertBefore(art, host.firstChild);
      if (!reduce && glOrb(host)) return;
      art.appendChild(make());
    });
    document.querySelectorAll("a[data-portal]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault();
        var r = a.getBoundingClientRect();
        var href = a.getAttribute("href");
        try { sessionStorage.setItem(KEY, "1"); } catch (err) {}
        // we leave the page: cover it, then navigate (the next page opens the portal back up)
        if (!reduce) {
          var reach = Math.hypot(Math.max(r.left + r.width / 2, window.innerWidth - r.left - r.width / 2), Math.max(r.top + r.height / 2, window.innerHeight - r.top - r.height / 2)) * 1.35;
          var cvs = fullscreen(r.left + r.width / 2, r.top + r.height / 2, 8, reach, 950, easeIn, 0.2, 1, function () { location.href = href; });
          if (cvs) return;
        }
        var fx = document.createElement("div"); fx.className = "portal-fx";
        var veil = document.createElement("div"); veil.className = "portal-veil";
        var p = make(); p.style.setProperty("--s", "200px");
        p.style.left = (r.left + r.width / 2) + "px"; p.style.top = (r.top + r.height / 2) + "px";
        fx.appendChild(veil); fx.appendChild(p); document.body.appendChild(fx);
        if (reduce) { location.href = href; return; }
        var far = Math.max(Math.hypot(window.innerWidth, window.innerHeight) / 200 * 1.3, 6);
        p.animate([{ transform: "translate(-50%,-50%) scale(0.05) rotate(0deg)", opacity: 0 },
                   { transform: "translate(-50%,-50%) scale(0.6) rotate(90deg)", opacity: 1, offset: 0.25 },
                   { transform: "translate(-50%,-50%) scale(" + far + ") rotate(260deg)", opacity: 1 }],
          { duration: 800, easing: "cubic-bezier(.55,.05,.35,1)", fill: "forwards" });
        veil.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }], { duration: 800, fill: "forwards" })
          .onfinish = function () { location.href = href; };
      });
    });
    var came = false;
    try { came = sessionStorage.getItem(KEY) === "1"; sessionStorage.removeItem(KEY); } catch (err) {}
    if (came && !reduce) arrive(); else document.documentElement.classList.remove("portal-arriving");
  });

  // set early so the new page never flashes before the veil is built
  try { if (sessionStorage.getItem(KEY) === "1" && !reduce) document.documentElement.classList.add("portal-arriving"); } catch (e) {}
})();
