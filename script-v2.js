window.addEventListener("load", function () {
  const loader = document.getElementById("loader");

  setTimeout(function () {
    loader.classList.add("fade-out");
  }, 3000);
});