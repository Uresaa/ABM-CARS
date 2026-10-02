const EUR_PER_KRW = 0.0006134351235;

const kosovoDeliveryFees = [
  { maxPrice: 10000, fee: 2500 },
  { maxPrice: 15000, fee: 2250 },
  { maxPrice: 17000, fee: 1650 },
  { maxPrice: 20000, fee: 2000 },
  { maxPrice: 30000, fee: 2800 },
  { maxPrice: 40000, fee: 2000 },
  { maxPrice: 50000, fee: 2030 },
  { maxPrice: Infinity, fee: 3500 },
];

export function calculateKosovoPrice(priceKrw) {
  if (!priceKrw) return null;

  const carPriceEur = Number(priceKrw) * EUR_PER_KRW;
  const transportEur = kosovoDeliveryFees.find(
    ({ maxPrice }) => carPriceEur <= maxPrice,
  ).fee;

  return carPriceEur + transportEur;
}
