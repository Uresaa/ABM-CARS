import { createTtlCache } from "./ttl-cache.mjs";
import { createPersistentStore } from "./persistent-store.mjs";
import { carCachePath } from "./paths.mjs";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 20000;

const categories = createTtlCache({ ttlMs: CACHE_TTL_MS, maxEntries: MAX_ENTRIES });

const store = createPersistentStore({
  name: "cars",
  path: carCachePath,
  serialize: () => categories.entries(),
  deserialize: (saved) => categories.restore(saved),
});

export async function loadCarCache() {
  const restored = await store.load();
  if (restored) {
    console.log("Restored car cache", { cars: categories.entries().length });
  }
}

export function saveCarCache() {
  return store.save();
}

export function getCachedCategory(carId) {
  return categories.get(carId);
}

export function setCachedCategory(carId, category) {
  categories.set(carId, category);
  store.markDirty();
}

export function forgetCategory(carId) {
  if (categories.remove(carId)) store.markDirty();
}

export function getPendingCategory(carId) {
  return categories.getPending(carId);
}

export function setPendingCategory(carId, request) {
  return categories.setPending(carId, request);
}
