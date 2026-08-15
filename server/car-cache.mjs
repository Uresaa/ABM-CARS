const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();
const pending = new Map();

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

export function getPendingCategory(carId) {
  return pending.get(carId) || null;
}

export function setPendingCategory(carId, request) {
  pending.set(carId, request);

  request.finally(() => {
    if (pending.get(carId) === request) pending.delete(carId);
  }).catch(() => {});

  return request;
}
