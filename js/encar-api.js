const EncarApi = (() => {
  const { ALL_CARS_QUERY, buildQuery, readFilterOptions } = window.EncarFilter;

  const LIST_URL = "/api/cars";
  const IMAGE_URL = "/api/car-image?path=";
  const DETAIL_URL = "/car-details/";
  const NAVIGATION = "|Metadata|Sort";

  async function sendSearchRequest({
    offset = 0,
    limit = 12,
    query = ALL_CARS_QUERY,
    navigation,
  } = {}) {
    const parameters = new URLSearchParams({
      count: "true",
      q: query,
      sr: `|ModifiedDate|${offset}|${limit}`,
    });

    if (navigation) parameters.set("inav", navigation);

    const carsResponse = await fetch(`${LIST_URL}?${parameters}`, {
      headers: { Accept: "application/json" },
      credentials: "omit",
    });

    if (!carsResponse.ok) {
      throw new Error(`Encar returned HTTP ${carsResponse.status}`);
    }

    return carsResponse.json();
  }

  const MAX_CONCURRENT_REQUESTS = 4;
  let activeRequests = 0;
  const pendingRequests = [];

  function runNextRequest() {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) return;
    const next = pendingRequests.shift();
    if (!next) return;

    activeRequests += 1;
    sendSearchRequest(next.options)
      .then(next.resolve, next.reject)
      .finally(() => {
        activeRequests -= 1;
        runNextRequest();
      });
  }

  function requestSearchData(options) {
    return new Promise((resolve, reject) => {
      pendingRequests.push({ options, resolve, reject });
      runNextRequest();
    });
  }

  const TRENDING_MANUFACTURERS = ["BMW", "벤츠", "아우디"];
  const TRENDING_MANUFACTURER_LABELS = [
    "BMW",
    "Mercedes-Benz",
    "Audi",
    "Volkswagen",
    "Toyota",
    "Porsche",
  ];

  function manufacturerQuery(manufacturer) {
    return `(And.Hidden.N._.(C.CarType.N._.Manufacturer.${manufacturer}.))`;
  }

  function compareManufacturers(first, second) {
    const firstRank = TRENDING_MANUFACTURER_LABELS.indexOf(first.label);
    const secondRank = TRENDING_MANUFACTURER_LABELS.indexOf(second.label);

    if (firstRank !== -1 || secondRank !== -1) {
      return (
        (firstRank === -1 ? Infinity : firstRank) -
        (secondRank === -1 ? Infinity : secondRank)
      );
    }

    return first.label.localeCompare(second.label, "en");
  }

  function sortByPopularity(options) {
    return [...options].sort(
      (first, second) =>
        (second.count || 0) - (first.count || 0) ||
        first.label.localeCompare(second.label, "en"),
    );
  }

  function normalizeCar(car) {
    const photoPath = car.Photos?.[0]?.location ?? null;

    return {
      id: car.Id,
      manufacturer: car.ManufacturerEnglish || car.Manufacturer,
      model: car.ModelEnglish || car.Model,
      badge: car.BadgeEnglish || car.Badge,
      year: car.FormYear,
      mileage: Number(car.Mileage) || 0,
      sellingPriceEur:
        typeof car.SellingPrice === "number" ? car.SellingPrice : null,
      fuelType: car.FuelType,
      transmission: car.Transmission,
      accidentFree:
        typeof car.AccidentFree === "boolean" ? car.AccidentFree : null,
      photoUrl: photoPath
        ? `${IMAGE_URL}${encodeURIComponent(photoPath)}`
        : null,
      detailUrl: `${DETAIL_URL}${encodeURIComponent(car.Id)}`,
    };
  }

  async function searchCars(options = {}) {
    const { offset = 0, limit = 12 } = options;
    const data = await requestSearchData(options);
    const cars = Array.isArray(data.SearchResults) ? data.SearchResults : [];

    return {
      total: Number(data.Count) || 0,
      offset,
      limit,
      cars: cars.map(normalizeCar),
    };
  }

  async function searchTrendingCars({
    offset = 0,
    carsPerManufacturer = 4,
  } = {}) {
    const carsOffset = Math.floor(offset / TRENDING_MANUFACTURERS.length);
    const limit = carsPerManufacturer * TRENDING_MANUFACTURERS.length;
    const outcomes = await Promise.allSettled(
      TRENDING_MANUFACTURERS.map((manufacturer) =>
        searchCars({
          offset: carsOffset,
          limit: carsPerManufacturer,
          query: buildQuery({
            categoryQuery: manufacturerQuery(manufacturer),
          }),
        }),
      ),
    );

    outcomes
      .filter((outcome) => outcome.status === "rejected")
      .forEach((outcome) => console.error(outcome.reason));

    const results = outcomes
      .filter((outcome) => outcome.status === "fulfilled")
      .map((outcome) => outcome.value);

    if (!results.length) {
      throw new Error("All trending car searches failed");
    }

    return {
      total: results.reduce((count, result) => count + result.total, 0),
      offset,
      limit,
      isTrending: true,
      cars: results.flatMap((result) => result.cars),
    };
  }

  const DOMESTIC_CARS_QUERY = "(And.Hidden.N._.CarType.Y.)";
  const IMPORTED_CARS_QUERY = "(And.Hidden.N._.CarType.N.)";

  let manufacturerRequest;
  let totalCarsCountRequest;
  const modelRequests = new Map();
  const variantRequests = new Map();

  function loadTotalCarsCount() {
    if (!totalCarsCountRequest) {
      totalCarsCountRequest = requestSearchData({ limit: 0 }).then(
        (data) => Number(data.Count) || 0,
      );
    }

    return totalCarsCountRequest;
  }

  async function requestFilterOptions(query, filterName) {
    const data = await requestSearchData({
      query,
      limit: 0,
      navigation: NAVIGATION,
    });

    return readFilterOptions(data.iNav, filterName);
  }

  function loadManufacturers() {
    if (!manufacturerRequest) {
      manufacturerRequest = Promise.all([
        requestFilterOptions(DOMESTIC_CARS_QUERY, "Manufacturer"),
        requestFilterOptions(IMPORTED_CARS_QUERY, "Manufacturer"),
      ]).then((groups) => groups.flat().sort(compareManufacturers));
    }

    return manufacturerRequest;
  }

  function loadModels(manufacturerQuery) {
    if (!modelRequests.has(manufacturerQuery)) {
      modelRequests.set(
        manufacturerQuery,
        requestFilterOptions(manufacturerQuery, "ModelGroup"),
      );
    }

    return modelRequests.get(manufacturerQuery);
  }

  async function collectFulfilled(promises) {
    const results = await Promise.allSettled(promises);
    return results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
  }

  function loadVariants(modelGroupQuery) {
    if (!variantRequests.has(modelGroupQuery)) {
      variantRequests.set(
        modelGroupQuery,
        (async () => {
          const models = await requestFilterOptions(modelGroupQuery, "Model");
          const groups = (
            await collectFulfilled(
              models.map(({ query }) =>
                requestFilterOptions(query, "BadgeGroup"),
              ),
            )
          ).flat();
          const badges = (
            await collectFulfilled(
              groups.map(({ query }) => requestFilterOptions(query, "Badge")),
            )
          ).flat();
          return sortByPopularity(
            Array.from(
              new Map(badges.map((badge) => [badge.query, badge])).values(),
            ),
          );
        })(),
      );
    }
    return variantRequests.get(modelGroupQuery);
  }

  return Object.freeze({
    buildSearchQuery: buildQuery,
    loadManufacturers,
    loadModels,
    loadVariants,
    loadTotalCarsCount,
    searchCars,
    searchTrendingCars,
  });
})();

window.EncarApi = EncarApi;
window.encarCarsRequest = EncarApi.searchTrendingCars();
window.encarTotalCarsCountRequest = EncarApi.loadTotalCarsCount();
