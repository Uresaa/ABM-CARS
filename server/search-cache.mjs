import { createTtlCache } from "./ttl-cache.mjs";

const LISTING_TTL_MS = 30 * 60 * 1000;
const METADATA_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

const searches = createTtlCache({ ttlMs: LISTING_TTL_MS, maxEntries: MAX_ENTRIES });

export function getCachedSearch(key, isMetadata = false) {
  return searches.get(key, isMetadata ? METADATA_TTL_MS : LISTING_TTL_MS);
}

export function getStaleSearch(key) {
  return searches.getStale(key);
}

export function setCachedSearch(key, body, entryTtlMs) {
  searches.set(key, body, entryTtlMs);
}

export function getPendingSearch(key) {
  return searches.getPending(key);
}

export function setPendingSearch(key, request) {
  return searches.setPending(key, request);
}
