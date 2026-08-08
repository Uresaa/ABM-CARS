// Keep in sync with WON_PER_EUR in js/encar-filter.js, used there to convert the
// price filter's EUR bounds into Encar's won-based query units.
const WON_PER_EUR = 1698.46;

function calculateMarkup(priceInEuro) {
  if (priceInEuro <= 15000) {
    return 2300;
  }

  if (priceInEuro <= 18000) {
    return 2300 - (priceInEuro - 15000) / 10;
  }

  if (priceInEuro <= 30000) {
    return 2000;
  }

  if (priceInEuro <= 32000) {
    return 2000 - (priceInEuro - 30000) / 10;
  }

  return 1800;
}

export function calculateSellingPrice(encarPrice) {
  const priceInWon = Number(encarPrice) * 10000;
  if (!priceInWon) return null;

  const priceInEuro = Math.round(priceInWon / WON_PER_EUR / 100) * 100;

  return priceInEuro + calculateMarkup(priceInEuro);
}
