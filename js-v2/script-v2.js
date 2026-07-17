// ── Dark-mode toggle (moon button) ──
// The nav pages (about / shop / contact) ship with class="subpage dark" and no
// toggle button — they stay dark at all times. Only the pages showing the work
// carry the toggle, and their choice is remembered across those pages.
(function () {
  var body = document.body;
  var btn = document.getElementById("themeToggle");
  if (!body || !btn) return; // always-dark pages keep their hardcoded class

  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  if (saved === "dark") body.classList.add("dark");
  else if (saved === "light") body.classList.remove("dark");

  function refreshIcon() {
    btn.textContent = body.classList.contains("dark") ? "☀" : "☾";
  }
  refreshIcon();

  btn.addEventListener("click", function () {
    var nowDark = !body.classList.contains("dark");
    body.classList.toggle("dark", nowDark);
    try { localStorage.setItem("theme", nowDark ? "dark" : "light"); } catch (e) {}
    refreshIcon();
  });
})();

// ── Loading page (index only) ──
// The star spins for 3 seconds the FIRST time the site is opened this visit,
// then the loader fades out. On later returns to the landing page (same
// browser session) the loader is skipped so it doesn't repeat.
window.addEventListener("load", function () {
  var loader = document.getElementById("loader");
  if (!loader) return;

  function revealSite() {
    document.body.classList.remove("is-loading");
    document.body.classList.add("loaded");
  }

  var alreadyShown = false;
  try { alreadyShown = sessionStorage.getItem("loaderShown") === "1"; } catch (e) {}

  if (alreadyShown) {
    // skip straight to the site — no spin
    loader.style.display = "none";
    revealSite();
    return;
  }

  setTimeout(function () {
    loader.classList.add("hide", "hide-loader");
    revealSite();
    try { sessionStorage.setItem("loaderShown", "1"); } catch (e) {}
  }, 3000);
});

// ── Language switcher (English ⇄ Estonian) ──
// Elements with data-i18n="key" get their text from js-v2/translations.js.
// The chosen language is remembered between visits.
(function () {
  function currentLang() {
    var saved = null;
    try { saved = localStorage.getItem("lang"); } catch (e) {}
    return saved === "et" ? "et" : "en";
  }

  function applyLang(lang) {
    if (!window.I18N) return;
    var dict = window.I18N[lang] || window.I18N.en;

    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    });

    var titleKey = document.body.getAttribute("data-title-key");
    if (titleKey && dict[titleKey]) document.title = dict[titleKey];
  }

  window.setLang = function (lang) {
    try { localStorage.setItem("lang", lang); } catch (e) {}
    applyLang(lang);
  };

  document.addEventListener("DOMContentLoaded", function () {
    // build the toggle chip if the page has a spot for it
    var toggle = document.getElementById("langToggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        window.setLang(currentLang() === "en" ? "et" : "en");
      });
    }
    applyLang(currentLang());
  });
})();

// ── Lightbox (sub pages) ──
// Click any framed image to see it big; click anywhere to close.
document.addEventListener("DOMContentLoaded", function () {
  var frames = document.querySelectorAll(".frame img");
  var hasCarousels = document.querySelector("[data-flickity]");
  if (frames.length === 0 && !hasCarousels) return;

  var lightbox = document.createElement("div");
  lightbox.id = "lightbox";
  lightbox.innerHTML =
    '<button class="lightbox-close" aria-label="Close">&times;</button><img src="" alt="">';
  document.body.appendChild(lightbox);

  var lightboxImg = lightbox.querySelector("img");

  function openLightbox(img) {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || "";
    lightbox.classList.add("open");
  }

  frames.forEach(function (img) {
    // images wrapped in their own link (e.g. to an external site) keep it
    if (img.closest("a")) return;
    img.addEventListener("click", function () { openLightbox(img); });
  });

  lightbox.addEventListener("click", function () {
    lightbox.classList.remove("open");
    lightboxImg.src = "";
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") lightbox.classList.remove("open");
  });

  // carousel pictures open up close too — Flickity's staticClick fires on
  // real clicks/taps only, never while dragging the carousel
  window.addEventListener("load", function () {
    if (!window.Flickity) return;
    document.querySelectorAll("[data-flickity]").forEach(function (el) {
      var flkty = Flickity.data(el);
      if (!flkty) return;
      flkty.on("staticClick", function (event, pointer, cellElement) {
        if (!cellElement) return;
        var img = cellElement.querySelector("img");
        if (img) openLightbox(img);
      });
    });
  });
});

// ── Carousel arrows: line them up with the middle of the picture ──
// Flickity parks its buttons at 50% of the whole carousel, but the cells hold a
// picture with a caption underneath, so the arrows drift below the picture by a
// different amount on every carousel. Measure the actual picture instead.
window.addEventListener("load", function () {
  if (!window.Flickity) return;

  document.querySelectorAll("[data-flickity]").forEach(function (el) {
    var flkty = Flickity.data(el);
    if (!flkty) return;

    function placeArrows() {
      var cell = flkty.selectedElement || el.querySelector(".carousel-cell");
      if (!cell) return;
      var media = cell.querySelector("img, video");
      if (!media) return;

      var m = media.getBoundingClientRect();
      if (!m.height) return; // not laid out yet
      var c = el.getBoundingClientRect();
      var middle = m.top - c.top + m.height / 2;

      // the buttons keep their translateY(-50%), so `top` becomes their centre
      el.querySelectorAll(".flickity-button").forEach(function (btn) {
        btn.style.top = middle + "px";
      });
    }

    placeArrows();
    flkty.on("select", placeArrows);
    window.addEventListener("resize", placeArrows);

    // pictures that are still loading change height when they arrive
    el.querySelectorAll("img").forEach(function (img) {
      if (!img.complete) img.addEventListener("load", placeArrows, { once: true });
    });
  });
});
