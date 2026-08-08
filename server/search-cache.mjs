const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

export function getCachedSearch(key) {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

export function setCachedSearch(key, data) {
  cache.set(key, { data, cachedAt: Date.now() });
}
