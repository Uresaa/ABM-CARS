const EUR_PER_KRW = 0.0006134351235;

const kosovoDeliveryFees = [
  { maxPrice: 15000, fee: 1600 },
  { maxPrice: 17000, fee: 1350 },
  { maxPrice: 20000, fee: 1000 },
  { maxPrice: 30000, fee: 800 },
  { maxPrice: 40000, fee: -300 },
  { maxPrice: 50000, fee: -600 },
  { maxPrice: Infinity, fee: -1000 },
];

export function calculateKosovoPrice(priceKrw) {
  if (!priceKrw) return null;

  const carPriceEur = Number(priceKrw) * EUR_PER_KRW;
  const transportEur = kosovoDeliveryFees.find(
    ({ maxPrice }) => carPriceEur <= maxPrice,
  ).fee;

  return carPriceEur + transportEur;
}
