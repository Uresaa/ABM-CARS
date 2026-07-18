const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();

export function getCachedCategory(carId) {
  const entry = cache.get(carId);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(carId);
    return null;
  }

  return entry.category;
}

export function setCachedCategory(carId, category) {
  cache.set(carId, { category, cachedAt: Date.now() });
}
