// ── Writings: paper that unfolds ──
// Each entry is a ball of crumpled paper with its title underneath. On hover
// (or tap / Enter) the ball opens up frame by frame, like stop-motion, into a
// flat sheet, and the writing fades in on it. Moving away (or tapping
// elsewhere / pressing Escape) folds it back up the same way.
// The still frames live in writings-frames/p{variant}-{frame}.webp
// Entries come from js-v2/writings-data.js
(function () {
  var host = document.getElementById("letters");
  if (!host) return;

  var FRAMES = 10;        // stills per paper
  var VARIANTS = 3;       // different paper balls, so the cards don't all look alike
  var STEP_MS = 75;       // time per frame — lower = quicker unfold
  var DIR = "writings-frames/";
  var MARGIN = 12;

  var key = host.getAttribute("data-collection");
  var list = (window.WRITINGS && window.WRITINGS[key]) || [];
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function frameSrc(v, i) { return DIR + "p" + v + "-" + i + ".webp"; }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  if (!list.length) {
    host.appendChild(el("p", "letters-empty", "Nothing here yet…"));
    return;
  }

  var items = [];
  var lastPointer = "mouse";

  function showFrame(it, i) {
    it.imgs[it.cur].classList.remove("on");
    it.imgs[i].classList.add("on");
    it.cur = i;
  }

  // fade + "scroll" cue at the bottom while there is more writing below,
  // and a soft fade at the top once the reader has scrolled down
  function scrollState(it) {
    var s = it.scroller;
    var more = s.scrollHeight - s.scrollTop - s.clientHeight > 6;
    it.paper.classList.toggle("more", more);
    it.paper.classList.toggle("scrolled", s.scrollTop > 6);
  }

  function finished(it) {
    if (it.target === FRAMES - 1) { it.node.classList.add("flat", "shift"); scrollState(it); }   // sheet is open: show the writing
    else it.node.classList.remove("open", "shift");                // back to a ball
  }

  function run(it) {
    if (reduceMotion) { showFrame(it, it.target); finished(it); return; }
    if (it.timer) return;
    it.timer = setInterval(function () {
      if (it.cur < it.target) showFrame(it, it.cur + 1);
      else if (it.cur > it.target) showFrame(it, it.cur - 1);
      // once the paper is mostly open, glide it to where it fits on screen
      if (it.target === FRAMES - 1 && it.cur >= 4) it.node.classList.add("shift");
      if (it.cur === it.target) {
        clearInterval(it.timer); it.timer = null;
        finished(it);
      }
    }, STEP_MS);
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
      var cue = el("div", "scroll-cue"); cue.innerHTML = "<span>scroll</span><i></i>";
      paper.appendChild(head); paper.appendChild(sc); paper.appendChild(cue);
      cue.style.bottom = "0.2rem";
      sheet.appendChild(close); sheet.appendChild(paper); reader.appendChild(sheet);
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

  function isOpen(it) { return it.target === FRAMES - 1; }

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

  function open(it) {
    if (isOpen(it)) return;
    items.forEach(function (o) { if (o !== it) close(o); });
    place(it);
    it.node.classList.add("open");
    it.node.setAttribute("aria-expanded", "true");
    it.target = FRAMES - 1;
    run(it);
  }

  function close(it) {
    if (it.target === 0 && it.cur === 0) return;
    it.node.classList.remove("flat", "shift");
    it.scroller.scrollTop = 0;
    it.node.setAttribute("aria-expanded", "false");
    it.target = 0;
    run(it);
  }

  list.forEach(function (entry, n) {
    var v = n % VARIANTS;

    var node = el("div", "letter");
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("aria-expanded", "false");
    node.setAttribute("aria-label", entry.title);

    // closed: a crumpled ball with its title underneath
    var ball = el("div", "ball");
    ball.style.backgroundImage = "url(" + frameSrc(v, 0) + ")";
    var label = el("div", "ball-label");
    label.appendChild(el("span", "ball-title", entry.title));
    if (entry.date) label.appendChild(el("span", "ball-date", entry.date));

    // open: the frames, with the flat sheet (and the writing) on top
    var shell = el("div", "paper-shell");
    var stack = el("div", "frame-stack");
    var imgs = [];
    for (var i = 0; i < FRAMES; i++) {
      var img = el("img", "frame" + (i === 0 ? " on" : ""));
      img.src = frameSrc(v, i);
      img.alt = "";
      img.draggable = false;
      stack.appendChild(img);
      imgs.push(img);
    }
    var paper = el("article", "paper");
    var head = el("header", "paper-head");
    head.appendChild(el("h2", "paper-title", entry.title));
    if (entry.date) head.appendChild(el("p", "paper-date", entry.date));
    var scroller = el("div", "paper-scroll");
    scroller.appendChild(el("div", "paper-text", entry.text));
    var cue = el("div", "scroll-cue");
    cue.setAttribute("aria-hidden", "true");
    cue.innerHTML = "<span>scroll</span><i></i>";
    paper.appendChild(head);
    paper.appendChild(scroller);
    paper.appendChild(cue);
    shell.appendChild(stack);
    shell.appendChild(paper);

    node.appendChild(ball);
    node.appendChild(label);
    node.appendChild(shell);
    host.appendChild(node);

    var it = { entry: entry, node: node, ball: ball, shell: shell, imgs: imgs, paper: paper, scroller: scroller, cur: 0, target: 0, timer: null };
    scroller.addEventListener("scroll", function () { scrollState(it); }, { passive: true });
    items.push(it);

    node.addEventListener("pointerenter", function (e) {
      lastPointer = e.pointerType;
      if (e.pointerType === "mouse") open(it);
    });
    node.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse") close(it);
    });
    node.addEventListener("pointerdown", function (e) { lastPointer = e.pointerType; });

    node.addEventListener("click", function (e) {
      // a mouse already opens it on hover; taps and keyboard presses toggle
      if (isOpen(it) && it.node.classList.contains("flat")) {
        openReader(it, e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2);
        return;
      }
      if (lastPointer === "mouse" && e.detail !== 0) return;
      if (isOpen(it)) close(it); else open(it);
    });
    node.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isOpen(it)) close(it); else open(it);
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
