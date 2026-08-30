(() => {
  document.querySelectorAll(".faq__question").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.parentElement.classList.toggle("active");
    });
  });

  const menuToggle = document.querySelector("#menu-toggle");
  const nav = document.querySelector("#nav");

  menuToggle.addEventListener("click", () => {
    nav.classList.toggle("active");
  });

  nav.querySelectorAll(".nav__list a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("active");
    });
  });
})();
