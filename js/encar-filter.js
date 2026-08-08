const EncarFilter = (() => {
  const ALL_CARS_QUERY = "(And.Hidden.N.)";

  function readFilterOptions(filterData, filterName) {
    const pending = [filterData];

    while (pending.length) {
      const node = pending.pop();

      if (!node || typeof node !== "object") continue;

      if (node.Name === filterName) {
        return (node.Facets || [])
          .filter((option) => option.Action)
          .map((option) => ({
            label:
              option.Metadata?.EngName?.find(Boolean) ||
              option.DisplayValue ||
              option.Value,
            query: option.Action,
          }));
      }

      Object.values(node).forEach((child) => {
        if (Array.isArray(child)) pending.push(...child);
        else pending.push(child);
      });
    }

    return [];
  }

  function createRangeCondition(name, lower, upper) {
    if (!lower && !upper) return null;
    return `${name}.range(${lower || ""}..${upper || ""}).`;
  }

  function buildQuery({
    categoryQuery,
    fuel,
    transmission,
    yearFrom,
    mileageFrom,
    mileageTo,
    priceFrom,
    priceTo,
  } = {}) {
    const conditions = [
      fuel && `FuelType.${fuel}.`,
      transmission && `Transmission.${transmission}.`,
      createRangeCondition("Year", yearFrom && `${yearFrom}00`, ""),
      createRangeCondition("Mileage", mileageFrom, mileageTo),
      createRangeCondition("Price", priceFrom, priceTo),
    ].filter(Boolean);
    const baseQuery = categoryQuery || ALL_CARS_QUERY;

    if (!conditions.length) return baseQuery;
    return `${baseQuery.slice(0, -1)}_.${conditions.join("_.")})`;
  }

  return Object.freeze({
    ALL_CARS_QUERY,
    buildQuery,
    readFilterOptions,
  });
})();

window.EncarFilter = EncarFilter;
