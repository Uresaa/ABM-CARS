const CarPricing = (() => {
  // Keep in sync with WON_PER_EUR in server/car-price.mjs. The server uses it
  // to compute SellingPrice; here it only maps a filter's EUR bounds back to
  // the won-based units the Encar search API expects.
  const WON_PER_EUR = 1698.46;

  function euroToEncarPriceUnit(priceEur) {
    return priceEur ? Math.round((priceEur * WON_PER_EUR) / 10000) : "";
  }

  function formatSellingPrice(sellingPriceEur) {
    return typeof sellingPriceEur === "number"
      ? `${CarFormat.formatNumber(Math.round(sellingPriceEur))} €`
      : "Çmimi sipas kërkesës";
  }

  return Object.freeze({ euroToEncarPriceUnit, formatSellingPrice });
})();

window.CarPricing = CarPricing;
