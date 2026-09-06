const LISTING_TTL_MS = 60 * 1000;
const METADATA_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

const cache = new Map();
const pending = new Map();

export function getCachedSearch(key, isMetadata = false) {
  const entry = cache.get(key);
  if (!entry) return null;

  const ttl = isMetadata ? METADATA_TTL_MS : LISTING_TTL_MS;
  if (Date.now() - entry.cachedAt > ttl) return null;

  cache.delete(key);
  cache.set(key, entry);

  return entry.body;
}

export function getStaleSearch(key) {
  return cache.get(key)?.body ?? null;
}

export function setCachedSearch(key, body) {
  cache.delete(key);
  cache.set(key, { body, cachedAt: Date.now() });

  while (cache.size > MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

export function getPendingSearch(key) {
  return pending.get(key) || null;
}

export function setPendingSearch(key, request) {
  pending.set(key, request);

  request
    .finally(() => {
      if (pending.get(key) === request) pending.delete(key);
    })
    .catch(() => {});

  return request;
}
