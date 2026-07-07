// Loading page: the star spins for 3 seconds after everything
// has loaded, then the loader fades out and the site appears.
window.addEventListener("load", function () {
  var loader = document.getElementById("loader");

  setTimeout(function () {
    loader.classList.add("hide");
    document.body.classList.remove("is-loading");
  }, 3000);
});
