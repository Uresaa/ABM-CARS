const EncarApi = (() => {
  const LIST_URL = "https://api.encar.com/search/car/list/general";
  const IMAGE_URL = "https://ci.encar.com";
  const DETAIL_URL = "https://fem.encar.com/cars/detail";
  const ALL_CARS_QUERY = "(And.Hidden.N._.CarType.Y.)";

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

  function normalizeCar(car) {
    const photoPath = car.Photos?.[0]?.location ?? null;

    return {
      id: car.Id,
      manufacturer: car.Manufacturer,
      model: car.Model,
      badge: car.Badge,
      year: car.FormYear,
      mileage: Number(car.Mileage) || 0,
      fuelType: car.FuelType,
      location: car.OfficeCityState,
      photoUrl: photoPath ? `${IMAGE_URL}${photoPath}` : null,
      detailUrl: `${DETAIL_URL}/${encodeURIComponent(car.Id)}`,
    };
  }

  return Object.freeze({ searchCars });
})();

window.EncarApi = EncarApi;
window.encarCarsRequest = EncarApi.searchCars();
