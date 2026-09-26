import { createTtlCache } from "./ttl-cache.mjs";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ENTRIES = 5000;

const categories = createTtlCache({ ttlMs: CACHE_TTL_MS, maxEntries: MAX_ENTRIES });

export function getCachedCategory(carId) {
  return categories.get(carId);
}

export function getStaleCategory(carId) {
  return categories.getStale(carId);
}

export function setCachedCategory(carId, category) {
  categories.set(carId, category);
}

export function getPendingCategory(carId) {
  return categories.getPending(carId);
}

export function setPendingCategory(carId, request) {
  return categories.setPending(carId, request);
}
