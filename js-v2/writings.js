// ── Writings: flowers that bloom ──
// Each entry is a closed bud with its title underneath. On hover (or tap /
// Enter) the petals open, and once it is in bloom a sheet of paper unfolds out
// of its heart with the writing on it. Moving away (or tapping elsewhere /
// pressing Escape) closes it again. Clicking the open sheet steps through a
// portal into a bigger reading view.
// Entries come from js-v2/writings-data.js
(function () {
  var host = document.getElementById("letters");
  if (!host) return;

  var BLOOM_MS = 1500;    // how long the petals take to open before the sheet appears
  var MARGIN = 12;

  var key = host.getAttribute("data-collection");
  var list = (window.WRITINGS && window.WRITINGS[key]) || [];
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function docLink(l) {
    var a = document.createElement("a");
    a.className = "paper-link"; a.href = l.url; a.target = "_blank"; a.rel = "noopener";
    a.textContent = l.label;
    a.addEventListener("click", function (ev) { ev.stopPropagation(); });
    return a;
  }

  // collectible-card tilt: follows the mouse, foil + glare move with it
  function tilt(node) {
    node.addEventListener("pointermove", function (ev) {
      if (ev.pointerType === "touch") return;
      var r = node.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      node.classList.add("live");
      node.style.setProperty("--ry", ((x - 0.5) * 22).toFixed(2) + "deg");
      node.style.setProperty("--rx", ((0.5 - y) * 18).toFixed(2) + "deg");
      node.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      node.style.setProperty("--my", (y * 100).toFixed(1) + "%");
    });
    node.addEventListener("pointerleave", function () {
      node.classList.remove("live");
      node.style.setProperty("--rx", "0deg"); node.style.setProperty("--ry", "0deg");
    });
  }

  // phones: the foil and tilt follow how you hold the device (gyroscope)
  var gyroOn = false;
  function gyroStart() {
    if (gyroOn || !window.DeviceOrientationEvent) return;
    function begin() {
      if (gyroOn) return; gyroOn = true;
      window.addEventListener("deviceorientation", function (e) {
        if (e.gamma == null && e.beta == null) return;
        var x = clamp((e.gamma || 0) / 35, -1, 1), y = clamp(((e.beta || 0) - 50) / 35, -1, 1);
        var nodes = document.querySelectorAll(".paper-shell, .reader-sheet");
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          n.classList.add("live");
          n.style.setProperty("--ry", (x * 12).toFixed(2) + "deg");
          n.style.setProperty("--rx", (-y * 9).toFixed(2) + "deg");
          n.style.setProperty("--mx", (50 + x * 50).toFixed(1) + "%");
          n.style.setProperty("--my", (50 + y * 50).toFixed(1) + "%");
        }
      }, true);
    }
    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission().then(function (r) { if (r === "granted") begin(); }).catch(function () {});
      } else begin();
    } catch (err) {}
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  // a small seeded random so every flower is different but stays the same on reload
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  if (!list.length) {
    host.appendChild(el("p", "letters-empty", "Nothing here yet…"));
    return;
  }

  // ring 1 = big outer petals, ring 3 = small inner ones; they open one after another
  var RINGS = [
    { n: 5, len: 116, wid: 104, off: 0 },    // the five cherry-blossom petals
    { n: 5, len: 96, wid: 86, off: 36 }      // a smaller layer peeking out between them
  ];

  function buildFlower(seed) {
    var r = rng(seed * 97 + 13);
    var f = el("div", "flower tint" + (seed % 3));
    f.appendChild(el("div", "flower-glow"));
    var tilt = el("div", "flower-tilt");
    RINGS.forEach(function (ring, ri) {
      var wrap = el("div", "ring r" + (ri + 1));
      for (var i = 0; i < ring.n; i++) {
        var p = el("i", "petal");
        var a = ring.off + (360 / ring.n) * i + (r() - 0.5) * 14;
        p.style.setProperty("--a", a.toFixed(1) + "deg");
        p.style.setProperty("--l", (ring.len * (0.94 + r() * 0.12)).toFixed(1) + "px");
        p.style.setProperty("--w", (ring.wid * (0.9 + r() * 0.2)).toFixed(1) + "px");
        p.style.setProperty("--j", ((r() - 0.5) * 16).toFixed(1) + "deg");
        wrap.appendChild(p);
      }
      tilt.appendChild(wrap);
    });
    var heart = el("div", "heart");
    // long pink filaments with golden anthers, and one taller pistil in the middle
    for (var q = 0; q < 28; q++) {
      var fl = el("i", "fil");
      fl.style.setProperty("--a", (q * (360 / 28) + (r() - 0.5) * 14).toFixed(1) + "deg");
      fl.style.setProperty("--l", (26 + r() * 20).toFixed(1) + "px");
      fl.style.setProperty("--j", ((r() - 0.5) * 18).toFixed(1) + "deg");
      heart.appendChild(fl);
    }
    var pistil = el("i", "fil pistil");
    pistil.style.setProperty("--a", "0deg");
    pistil.style.setProperty("--l", "50px");
    pistil.style.setProperty("--j", "0deg");
    heart.appendChild(pistil);
    tilt.appendChild(heart);
    f.appendChild(tilt);
    return f;
  }

  var items = [];
  var lastPointer = "mouse";

  // fade + "scroll" cue at the bottom while there is more writing below,
  // and a soft fade at the top once the reader has scrolled down
  function scrollState(it) {
    var s = it.scroller;
    var more = s.scrollHeight - s.scrollTop - s.clientHeight > 6;
    it.paper.classList.toggle("more", more);
    it.paper.classList.toggle("scrolled", s.scrollTop > 6);
  }

  function place(it) {
    // keep the finished sheet fully on screen
    var r = it.ball.getBoundingClientRect();
    var pw = it.shell.offsetWidth, ph = it.shell.offsetHeight;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var left = cx - pw / 2, top = cy - ph / 2;
    var nl = pw > vw - 2 * MARGIN ? MARGIN : clamp(left, MARGIN, vw - pw - MARGIN);
    var nt = ph > vh - 2 * MARGIN ? MARGIN : clamp(top, MARGIN, vh - ph - MARGIN);
    it.shell.style.setProperty("--dx", (nl - left) + "px");
    it.shell.style.setProperty("--dy", (nt - top) + "px");
  }

  // click a paper -> a portal opens and the writing appears in a big reading view
  var reader = null;
  function openReader(it, x, y) {
    if (reader || !window.Portal) return;
    var e = it.entry;
    Portal.through(x, y, function () {
      reader = el("div", "reader");
      var sheet = el("div", "reader-sheet");
      var close = el("button", "reader-close", "\u00d7");
      close.setAttribute("aria-label", "Close");
      var paper = el("article", "paper more");
      paper.style.cssText = "position:static;opacity:1;pointer-events:auto;display:flex;flex-direction:column;min-height:0;padding:0;background:none";
      var head = el("header", "paper-head");
      head.appendChild(el("h2", "paper-title", e.title));
      if (e.date) head.appendChild(el("p", "paper-date", e.date));
      var sc = el("div", "paper-scroll");
      sc.appendChild(el("div", "paper-text", e.text));
      if (e.link) sc.appendChild(docLink(e.link));
      var cue = el("div", "scroll-cue"); cue.innerHTML = "<span>scroll</span><i></i>";
      paper.appendChild(head); paper.appendChild(sc); paper.appendChild(cue);
      cue.style.bottom = "0.2rem";
      sheet.appendChild(close); sheet.appendChild(paper); reader.appendChild(sheet);
      tilt(sheet);
      document.body.appendChild(reader);
      var upd = function () { scrollState({ scroller: sc, paper: paper }); };
      sc.addEventListener("scroll", upd, { passive: true }); upd();
      close.addEventListener("click", function (ev) { ev.stopPropagation(); closeReader(); });
      reader.addEventListener("click", function (ev) { if (ev.target === reader) closeReader(); });
      items.forEach(close_);
    });
  }
  function close_(it) { close(it); }
  function closeReader() {
    if (!reader) return;
    var r = reader, b = r.getBoundingClientRect();
    Portal.through(b.width / 2, b.height / 2, function () { r.remove(); reader = null; });
  }

  function isOpen(it) { return it.isOpen; }
  // while a card is open the page behind it stays put (on phones the card is pinned to the screen)
  function syncLock() {
    var any = items.some(function (o) { return o.node.classList.contains("flat"); });
    document.documentElement.classList.toggle("card-open", any);
  }

  function open(it) {
    if (it.isOpen) return;
    items.forEach(function (o) { if (o !== it) close(o); });
    place(it);
    it.isOpen = true;
    it.node.classList.add("open");
    it.node.setAttribute("aria-expanded", "true");
    clearTimeout(it.timer);
    it.timer = setTimeout(function () {
      if (!it.isOpen) return;
      it.node.classList.add("flat");
      syncLock();
      scrollState(it);
    }, reduceMotion ? 0 : BLOOM_MS);
  }

  function close(it) {
    if (!it.isOpen) return;
    it.isOpen = false;
    clearTimeout(it.timer);
    it.node.classList.remove("flat");
    syncLock();
    it.scroller.scrollTop = 0;
    it.node.setAttribute("aria-expanded", "false");
    // let the sheet fold away first, then the petals close
    it.timer = setTimeout(function () { if (!it.isOpen) it.node.classList.remove("open"); }, reduceMotion ? 0 : 250);
  }

  list.forEach(function (entry, n) {
    var node = el("div", "letter");
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("aria-expanded", "false");
    node.setAttribute("aria-label", entry.title);

    // closed: a bud with its title underneath
    var ball = el("div", "ball");
    ball.appendChild(buildFlower(n + 1));
    var label = el("div", "ball-label");
    label.appendChild(el("span", "ball-title", entry.title));
    if (entry.date) label.appendChild(el("span", "ball-date", entry.date));

    // open: the sheet that unfolds out of the flower's heart
    var shell = el("div", "paper-shell");
    var paper = el("article", "paper");
    var head = el("header", "paper-head");
    head.appendChild(el("h2", "paper-title", entry.title));
    if (entry.date) head.appendChild(el("p", "paper-date", entry.date));
    var scroller = el("div", "paper-scroll");
    scroller.appendChild(el("div", "paper-text", entry.text));
    if (entry.link) scroller.appendChild(docLink(entry.link));
    var cue = el("div", "scroll-cue");
    cue.setAttribute("aria-hidden", "true");
    cue.innerHTML = "<span>scroll</span><i></i>";
    paper.appendChild(head);
    paper.appendChild(scroller);
    paper.appendChild(cue);
    shell.appendChild(paper);
    tilt(shell);

    node.appendChild(ball);
    node.appendChild(label);
    node.appendChild(shell);
    host.appendChild(node);

    var it = { entry: entry, node: node, ball: ball, shell: shell, paper: paper, scroller: scroller, isOpen: false, timer: null };
    scroller.addEventListener("scroll", function () { scrollState(it); }, { passive: true });
    items.push(it);

    node.addEventListener("pointerenter", function (e) {
      lastPointer = e.pointerType;
      if (e.pointerType === "mouse") open(it);
    });
    node.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse") close(it);
    });
    node.addEventListener("pointerdown", function (e) {
      lastPointer = e.pointerType;
      if (e.pointerType !== "mouse") gyroStart();
    });

    node.addEventListener("click", function (e) {
      // a mouse already opens it on hover; taps and keyboard presses toggle
      if (it.isOpen && it.node.classList.contains("flat")) {
        // on a phone the card is already the reading view: tapping the text must not jump anywhere
        if (lastPointer !== "mouse") return;
        openReader(it, e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2);
        return;
      }
      if (lastPointer === "mouse" && e.detail !== 0) return;
      if (it.isOpen) close(it); else open(it);
    });
    node.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (it.isOpen) close(it); else open(it);
      }
    });
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".letter") && !e.target.closest(".portal-fx")) items.forEach(close);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (reader) closeReader(); else items.forEach(close); }
  });
})();
