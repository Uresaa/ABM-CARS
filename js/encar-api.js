const EncarApi = (() => {
  const LIST_URL = "/api/cars";
  const IMAGE_URL = "/api/car-image?path=";
  const DETAIL_URL = "./car-details.html?id=";
  const ALL_CARS_QUERY = "(And.Hidden.N._.CarType.Y.)";
  const TRENDING_MANUFACTURERS = ["BMW", "\uBCA4\uCE20", "\uC544\uC6B0\uB514"];

  function manufacturerQuery(manufacturer) {
    return `(And.Hidden.N._.(C.CarType.N._.Manufacturer.${manufacturer}.))`;
  }

  async function searchCars({
    offset = 0,
    limit = 12,
    query = ALL_CARS_QUERY,
  } = {}) {
    const parameters = new URLSearchParams({
      count: "true",
      q: query,
      sr: `|ModifiedDate|${offset}|${limit}`,
    });

    const carsResponse = await fetch(`${LIST_URL}?${parameters}`, {
      headers: { Accept: "application/json" },
      credentials: "omit",
    });

    if (!carsResponse.ok) {
      throw new Error(`Encar returned HTTP ${carsResponse.status}`);
    }

    const data = await carsResponse.json();
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
    const results = await Promise.all(
      TRENDING_MANUFACTURERS.map((manufacturer) =>
        searchCars({
          offset: carsOffset,
          limit: carsPerManufacturer,
          query: manufacturerQuery(manufacturer),
        }),
      ),
    );

    return {
      total: results.reduce((count, result) => count + result.total, 0),
      offset,
      limit,
      isTrending: true,
      cars: results.flatMap((result) => result.cars),
    };
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

      // Totali në Kore: çmimi i shitjes, taksa e blerjes dhe tarifat e transferimit.
      priceKrw: Number(car.KoreaTotalKrw) || 0,
      fuelType: car.FuelType,
      transmission: car.Transmission,
      photoUrl: photoPath
        ? `${IMAGE_URL}${encodeURIComponent(photoPath)}`
        : null,
      detailUrl: `${DETAIL_URL}${encodeURIComponent(car.Id)}`,
    };
  }

  return Object.freeze({ searchCars, searchTrendingCars });
})();

window.EncarApi = EncarApi;
window.encarCarsRequest = EncarApi.searchTrendingCars();
