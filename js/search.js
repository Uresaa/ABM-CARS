(() => {
  const filters = {
    brand: document.querySelector("#brand"),
    model: document.querySelector("#model"),
    transmission: document.querySelector("#transmission"),
    fuel: document.querySelector("#fuel"),
    yearFrom: document.querySelector("#year-from"),
    mileageFrom: document.querySelector("#mileage-from"),
    mileageTo: document.querySelector("#mileage-to"),
    price: document.querySelector("#price"),
  };
  const searchButton = document.querySelector("#cars-search");

  let modelRequestId = 0;

  function replaceOptions(select, placeholder, options = []) {
    const fragment = document.createDocumentFragment();

    fragment.append(new Option(placeholder, ""));
    options.forEach(({ label, query }) => {
      fragment.append(new Option(label, query));
    });
    select.replaceChildren(fragment);
  }

  async function loadManufacturers() {
    filters.brand.disabled = true;

    try {
      const manufacturers = await window.EncarApi.loadManufacturers();
      replaceOptions(filters.brand, "Zgjidh markën", manufacturers);
    } catch (error) {
      replaceOptions(filters.brand, "Markat nuk mund të ngarkohen");
    } finally {
      filters.brand.disabled = false;
    }
  }

  async function loadModels() {
    const manufacturerQuery = filters.brand.value;
    const requestId = ++modelRequestId;

    replaceOptions(filters.model, "Zgjidh modelin");
    filters.model.disabled = true;
    if (!manufacturerQuery) return;

    replaceOptions(filters.model, "Duke ngarkuar modelet...");

    try {
      const models = await window.EncarApi.loadModels(manufacturerQuery);
      if (requestId !== modelRequestId) return;
      replaceOptions(filters.model, "Çdo model", models);
      filters.model.disabled = false;
    } catch (error) {
      if (requestId !== modelRequestId) return;
      replaceOptions(filters.model, "Modelet nuk mund të ngarkohen");
    }
  }

  function updateMileageMaximums() {
    const minimum = Number(filters.mileageFrom.value);

    Array.from(filters.mileageTo.options).forEach((option) => {
      const maximum = Number(option.value);
      option.disabled = Boolean(minimum && maximum && maximum < minimum);
    });

    if (Number(filters.mileageTo.value) < minimum) {
      filters.mileageTo.value = "";
    }

    filters.mileageTo.setCustomValidity("");
  }

  function validMileageRange() {
    const from = Number(filters.mileageFrom.value);
    const to = Number(filters.mileageTo.value);
    const invalid = from && to && from > to;

    filters.mileageTo.setCustomValidity(
      invalid
        ? "Kilometrazha maksimale duhet të jetë e barabartë ose më e madhe."
        : "",
    );

    if (invalid) filters.mileageTo.reportValidity();
    return !invalid;
  }

  function searchCars() {
    if (!validMileageRange()) return;

    const [priceFromEur = "", priceToEur = ""] =
      filters.price.value.split(":");
    const query = window.EncarApi.buildSearchQuery({
      categoryQuery: filters.model.value || filters.brand.value,
      transmission: filters.transmission.value,
      fuel: filters.fuel.value,
      yearFrom: filters.yearFrom.value,
      mileageFrom: filters.mileageFrom.value,
      mileageTo: filters.mileageTo.value,
      priceFromEur,
      priceToEur,
    });

    window.dispatchEvent(
      new CustomEvent("cars:search", { detail: { query } }),
    );
    document.querySelector("#cars").scrollIntoView({ behavior: "smooth" });
  }

  filters.brand.addEventListener("change", loadModels);
  filters.mileageFrom.addEventListener("change", updateMileageMaximums);
  searchButton.addEventListener("click", searchCars);
  loadManufacturers();
})();
