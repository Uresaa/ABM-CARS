document.querySelectorAll(".faq__question").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.parentElement.classList.toggle("active");
  });
});
