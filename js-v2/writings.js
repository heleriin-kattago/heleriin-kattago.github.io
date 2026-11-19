// ── Writings: crumpled-paper letters ──
// Builds one folded, crumpled paper per entry in js-v2/writings-data.js.
// Mouse: hover to unfold. Touch / keyboard: tap or press Enter to unfold,
// tap elsewhere (or press Escape) to fold it back up.
(function () {
  var host = document.getElementById("letters");
  if (!host) return;

  var key = host.getAttribute("data-collection");
  var list = (window.WRITINGS && window.WRITINGS[key]) || [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  if (!list.length) {
    host.appendChild(el("p", "letters-empty", "Nothing here yet…"));
    return;
  }

  var letters = [];
  var lastPointer = "mouse";
  var MARGIN = 12;

  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  function open(letter) {
    letters.forEach(function (l) { if (l !== letter) close(l); });

    // keep the unfolded paper fully on screen
    var shell = letter.querySelector(".paper-shell");
    var r = letter.getBoundingClientRect();
    var pw = shell.offsetWidth, ph = shell.offsetHeight;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var left = cx - pw / 2, top = cy - ph / 2;
    var newLeft = pw > vw - 2 * MARGIN ? MARGIN : clamp(left, MARGIN, vw - pw - MARGIN);
    var newTop = ph > vh - 2 * MARGIN ? MARGIN : clamp(top, MARGIN, vh - ph - MARGIN);
    shell.style.setProperty("--dx", (newLeft - left) + "px");
    shell.style.setProperty("--dy", (newTop - top) + "px");

    letter.classList.add("open");
    letter.setAttribute("aria-expanded", "true");
  }

  function close(letter) {
    letter.classList.remove("open");
    letter.setAttribute("aria-expanded", "false");
  }

  list.forEach(function (entry) {
    var letter = el("div", "letter");
    letter.setAttribute("tabindex", "0");
    letter.setAttribute("role", "button");
    letter.setAttribute("aria-expanded", "false");

    // the folded, crumpled paper
    var foldShell = el("div", "fold-shell");
    var fold = el("div", "fold");
    fold.appendChild(el("span", "fold-title", entry.title));
    if (entry.date) fold.appendChild(el("span", "fold-date", entry.date));
    foldShell.appendChild(fold);

    // the unfolded paper
    var shell = el("div", "paper-shell");
    var paper = el("article", "paper");
    paper.appendChild(el("h2", "paper-title", entry.title));
    if (entry.date) paper.appendChild(el("p", "paper-date", entry.date));
    paper.appendChild(el("div", "paper-text", entry.text));
    shell.appendChild(paper);

    letter.appendChild(foldShell);
    letter.appendChild(shell);
    host.appendChild(letter);
    letters.push(letter);

    letter.addEventListener("pointerenter", function (e) {
      lastPointer = e.pointerType;
      if (e.pointerType === "mouse") open(letter);
    });
    letter.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse") close(letter);
    });
    letter.addEventListener("pointerdown", function (e) { lastPointer = e.pointerType; });

    letter.addEventListener("click", function (e) {
      // a mouse already unfolds on hover; taps and keyboard presses toggle
      if (lastPointer === "mouse" && e.detail !== 0) return;
      if (letter.classList.contains("open")) close(letter); else open(letter);
    });
    letter.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (letter.classList.contains("open")) close(letter); else open(letter);
      }
    });
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".letter")) letters.forEach(close);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") letters.forEach(close);
  });
})();
