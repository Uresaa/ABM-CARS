const brand = document.getElementById("brand");
const model = document.getElementById("model");

brand.addEventListener("change", function () {
  const selectedBrand = this.value;

  model.innerHTML = '<option value="">Zgjidh modelin</option>';

  if (!carModels[selectedBrand]) return;

  carModels[selectedBrand].forEach((car) => {
    const option = document.createElement("option");

    option.value = car;
    option.textContent = car;

    model.appendChild(option);
  });
});
