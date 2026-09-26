import { createTtlCache } from "./ttl-cache.mjs";

const DETAIL_TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 1000;

const details = createTtlCache({ ttlMs: DETAIL_TTL_MS, maxEntries: MAX_ENTRIES });

export function getCachedDetail(carId) {
  return details.get(carId);
}

export function getStaleDetail(carId) {
  return details.getStale(carId);
}

export function setCachedDetail(carId, body) {
  details.set(carId, body);
}

export function getPendingDetail(carId) {
  return details.getPending(carId);
}

export function setPendingDetail(carId, request) {
  return details.setPending(carId, request);
}
