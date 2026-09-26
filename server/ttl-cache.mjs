export function createTtlCache({ ttlMs, maxEntries }) {
  const cache = new Map();
  const pending = new Map();

  function get(key, overrideTtlMs = ttlMs) {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > (entry.ttlMs ?? overrideTtlMs)) return null;

    cache.delete(key);
    cache.set(key, entry);

    return entry.value;
  }

  function getStale(key) {
    const entry = cache.get(key);
    return entry ? entry.value : null;
  }

  function set(key, value, entryTtlMs) {
    cache.delete(key);
    cache.set(key, { value, cachedAt: Date.now(), ttlMs: entryTtlMs });

    while (cache.size > maxEntries) {
      cache.delete(cache.keys().next().value);
    }
  }

  function getPending(key) {
    return pending.get(key) || null;
  }

  function setPending(key, request) {
    pending.set(key, request);

    request
      .finally(() => {
        if (pending.get(key) === request) pending.delete(key);
      })
      .catch(() => {});

    return request;
  }

  return { get, getStale, set, getPending, setPending };
}
