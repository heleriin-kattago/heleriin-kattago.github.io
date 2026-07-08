// ── Loading page (index only) ──
// The star spins for 3 seconds after everything has loaded,
// then the loader fades out and the site appears.
window.addEventListener("load", function () {
  var loader = document.getElementById("loader");
  if (loader) {
    setTimeout(function () {
      loader.classList.add("hide");
      document.body.classList.remove("is-loading");
    }, 3000);
  }
});

// ── Lightbox (sub pages) ──
// Click any framed image to see it big; click anywhere to close.
document.addEventListener("DOMContentLoaded", function () {
  var frames = document.querySelectorAll(".frame img");
  if (frames.length === 0) return;

  var lightbox = document.createElement("div");
  lightbox.id = "lightbox";
  lightbox.innerHTML =
    '<button class="lightbox-close" aria-label="Close">&times;</button><img src="" alt="">';
  document.body.appendChild(lightbox);

  var lightboxImg = lightbox.querySelector("img");

  frames.forEach(function (img) {
    // images wrapped in their own link (e.g. to an external site) keep it
    if (img.closest("a")) return;
    img.addEventListener("click", function () {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || "";
      lightbox.classList.add("open");
    });
  });

  lightbox.addEventListener("click", function () {
    lightbox.classList.remove("open");
    lightboxImg.src = "";
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") lightbox.classList.remove("open");
  });
});
