const EUR_PER_KRW = 0.0006134351235;

const kosovoDeliveryFees = [
  { maxPrice: 15000, fee: 2300 },
  { maxPrice: 17000, fee: 2000 },
  { maxPrice: 20000, fee: 1900 },
  { maxPrice: 30000, fee: 1800 },
  { maxPrice: 40000, fee: 1600 },
  { maxPrice: 50000, fee: 1400 },
  { maxPrice: Infinity, fee: 1200 },
];

export function calculateKosovoPrice(priceKrw) {
  if (!priceKrw) return null;

  const carPriceEur = Number(priceKrw) * EUR_PER_KRW;
  const transportEur = kosovoDeliveryFees.find(
    ({ maxPrice }) => carPriceEur <= maxPrice,
  ).fee;

  return carPriceEur + transportEur;
}
