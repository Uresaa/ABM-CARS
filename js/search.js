(() => {
  const filters = {
    brand: document.querySelector("#brand"),
    model: document.querySelector("#model"),
    vehicleType: document.querySelector("#vehicle-type"),
    transmission: document.querySelector("#transmission"),
    fuel: document.querySelector("#fuel"),
    yearFrom: document.querySelector("#year-from"),
    mileageFrom: document.querySelector("#mileage-from"),
    mileageTo: document.querySelector("#mileage-to"),
    price: document.querySelector("#price"),
  };
  const searchButton = document.querySelector("#cars-search");
  const FILTERS_STORAGE_KEY = "abmcars:search-filters";

  let modelRequestId = 0;

  function saveFilterState() {
    const state = Object.fromEntries(
      Object.entries(filters).map(([key, select]) => [key, select.value]),
    );

    try {
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {}
  }

  function loadFilterState() {
    try {
      return JSON.parse(sessionStorage.getItem(FILTERS_STORAGE_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

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

  function formatTypeLabel(label) {
    const translations = [
      ["어드밴티지", "Advantage"],
      ["스포츠", "Sport"],
      ["프리미엄", "Premium"],
      ["럭셔리", "Luxury"],
      ["모던", "Modern"],
      ["익스클루시브", "Exclusive"],
      ["인스퍼레이션", "Inspiration"],
      ["디젤", "Diesel"],
      ["가솔린", "Benzinë"],
      ["전기", "Elektrik"],
      ["하이브리드", "Hibrid"],
    ];

    const formatted = translations.reduce(
      (value, [korean, translated]) => value.replaceAll(korean, translated),
      label,
    );

    return (
      formatted
        .replace(/[가-힣]+/g, "")
        .replace(/\s{2,}/g, " ")
        .trim() || "Tip i veçantë"
    );
  }

  async function loadVariants() {
    const modelQuery = filters.model.value;
    replaceOptions(filters.vehicleType, "Zgjidh tipin");
    filters.vehicleType.disabled = true;
    if (!modelQuery) return;

    replaceOptions(filters.vehicleType, "Duke ngarkuar tipet...");
    try {
      const variants = await window.EncarApi.loadVariants(modelQuery);
      if (modelQuery !== filters.model.value) return;

      const formattedVariants = variants.map((variant) => ({
        ...variant,
        label: formatTypeLabel(variant.label),
      }));

      const mergedVariants = new Map();
      formattedVariants.forEach((variant) => {
        const key = variant.label.toLowerCase();
        const existing = mergedVariants.get(key);
        if (!existing) {
          mergedVariants.set(key, { ...variant });
          return;
        }
        existing.count += variant.count;
        if (variant.count > (existing.bestCount ?? existing.count)) {
          existing.bestCount = variant.count;
          existing.query = variant.query;
        }
      });

      const uniqueVariants = Array.from(mergedVariants.values()).sort(
        (first, second) =>
          second.count - first.count || first.label.localeCompare(second.label),
      );

      replaceOptions(filters.vehicleType, "Çdo tip", uniqueVariants);
      filters.vehicleType.disabled = false;
    } catch (error) {
      if (modelQuery !== filters.model.value) return;
      replaceOptions(filters.vehicleType, "Tipet nuk mund të ngarkohen");
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

  function runSearch({ scroll = false } = {}) {
    if (!validMileageRange()) return;

    const [priceFromEur = "", priceToEur = ""] = filters.price.value.split(":");
    const searchOptions = {
      categoryQuery:
        filters.vehicleType.value || filters.model.value || filters.brand.value,
      transmission: filters.transmission.value,
      fuel: filters.fuel.value,
      yearFrom: filters.yearFrom.value,
      mileageFrom: filters.mileageFrom.value,
      mileageTo: filters.mileageTo.value,
      priceFromEur,
      priceToEur,
    };
    const selectedYear = Number(filters.yearFrom.value) || null;
    const query = window.EncarApi.buildSearchQuery(searchOptions);
    const exactYearQuery = selectedYear
      ? window.EncarApi.buildSearchQuery({
          ...searchOptions,
          yearTo: selectedYear,
        })
      : null;
    const laterYearQuery = selectedYear
      ? window.EncarApi.buildSearchQuery({
          ...searchOptions,
          yearFrom: selectedYear + 1,
        })
      : null;

    saveFilterState();

    window.dispatchEvent(
      new CustomEvent("cars:search", {
        detail: {
          query,
          yearFrom: selectedYear,
          exactYearQuery,
          laterYearQuery,
        },
      }),
    );

    if (scroll) {
      document.querySelector("#cars").scrollIntoView({ behavior: "smooth" });
    }
  }

  function searchCars() {
    runSearch({ scroll: true });
  }

  function handleFilterChange() {
    runSearch();
  }

  filters.brand.addEventListener("change", loadModels);
  filters.brand.addEventListener("change", handleFilterChange);
  filters.model.addEventListener("change", loadVariants);
  filters.model.addEventListener("change", handleFilterChange);
  filters.vehicleType.addEventListener("change", handleFilterChange);
  filters.transmission.addEventListener("change", handleFilterChange);
  filters.fuel.addEventListener("change", handleFilterChange);
  filters.yearFrom.addEventListener("change", handleFilterChange);
  filters.mileageFrom.addEventListener("change", updateMileageMaximums);
  filters.mileageFrom.addEventListener("change", handleFilterChange);
  filters.mileageTo.addEventListener("change", handleFilterChange);
  filters.price.addEventListener("change", handleFilterChange);
  searchButton.addEventListener("click", searchCars);

  function isBackForwardNavigation() {
    return (
      performance.getEntriesByType("navigation")[0]?.type === "back_forward"
    );
  }

  async function restoreFilterState() {
    if (!isBackForwardNavigation()) return;

    const state = loadFilterState();
    if (!state) return;

    if (state.brand) {
      filters.brand.value = state.brand;
      await loadModels();
    }
    if (state.model) {
      filters.model.value = state.model;
      await loadVariants();
    }
    if (state.vehicleType) filters.vehicleType.value = state.vehicleType;
    if (state.transmission) filters.transmission.value = state.transmission;
    if (state.fuel) filters.fuel.value = state.fuel;
    if (state.yearFrom) filters.yearFrom.value = state.yearFrom;
    if (state.mileageFrom) filters.mileageFrom.value = state.mileageFrom;
    updateMileageMaximums();
    if (state.mileageTo) filters.mileageTo.value = state.mileageTo;
    if (state.price) filters.price.value = state.price;

    runSearch();
  }

  loadManufacturers().then(restoreFilterState);
})();
