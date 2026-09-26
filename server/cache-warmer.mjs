import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { homepageSnapshotPath } from "./paths.mjs";
import { warmCarList } from "./request-handlers.mjs";
import {
  getCachedSearch,
  getStaleSearch,
  setCachedSearch,
} from "./search-cache.mjs";

const REFRESH_INTERVAL_MS = 25 * 60 * 1000;
const STARTUP_DELAY_MS = 1000;

const ALL_CARS_QUERY = "(And.Hidden.N.)";
const DOMESTIC_CARS_QUERY = "(And.Hidden.N._.CarType.Y.)";
const IMPORTED_CARS_QUERY = "(And.Hidden.N._.CarType.N.)";
const FILTER_NAVIGATION = "|Metadata|Sort";
const MINIMUM_YEAR_CONDITION = "Year.range(201600..).";
const TRENDING_MANUFACTURERS = ["BMW", "\uBCA4\uCE20", "\uC544\uC6B0\uB514"];
const TRENDING_CARS_PER_MANUFACTURER = 4;
const TRENDING_OFFSETS = [0, TRENDING_CARS_PER_MANUFACTURER];

const snapshotPath = homepageSnapshotPath;

const lastGoodBodies = new Map();

function trendingQuery(manufacturer) {
  return `(And.Hidden.N._.(C.CarType.N._.Manufacturer.${manufacturer}.)_.${MINIMUM_YEAR_CONDITION})`;
}

function searchUrl({ query, offset = 0, limit, navigation }) {
  const url = new URL("http://localhost/api/cars");

  url.searchParams.set("count", "true");
  url.searchParams.set("q", query);
  url.searchParams.set("sr", `|ModifiedDate|${offset}|${limit}`);

  if (navigation) url.searchParams.set("inav", navigation);

  return url;
}

function homepageSearchUrls() {
  return [
    searchUrl({ query: ALL_CARS_QUERY, limit: 0 }),
    ...TRENDING_OFFSETS.flatMap((offset) =>
      TRENDING_MANUFACTURERS.map((manufacturer) =>
        searchUrl({
          query: trendingQuery(manufacturer),
          offset,
          limit: TRENDING_CARS_PER_MANUFACTURER,
        }),
      ),
    ),
    searchUrl({
      query: DOMESTIC_CARS_QUERY,
      limit: 0,
      navigation: FILTER_NAVIGATION,
    }),
    searchUrl({
      query: IMPORTED_CARS_QUERY,
      limit: 0,
      navigation: FILTER_NAVIGATION,
    }),
  ];
}

async function restoreSnapshot() {
  try {
    const { savedAt, entries } = JSON.parse(await readFile(snapshotPath, "utf8"));
    const isFresh = Date.now() - Number(savedAt) < REFRESH_INTERVAL_MS;

    for (const [key, body] of Object.entries(entries || {})) {
      if (typeof body !== "string") continue;

      setCachedSearch(key, body, isFresh ? undefined : 0);
      lastGoodBodies.set(key, body);
    }

    console.log("Restored homepage cache", {
      entries: Object.keys(entries || {}).length,
      fresh: isFresh,
    });
  } catch {
    return;
  }
}

async function saveSnapshot() {
  const entries = Object.fromEntries(lastGoodBodies);

  if (!Object.keys(entries).length) return;

  try {
    await mkdir(dirname(snapshotPath), { recursive: true });
    await writeFile(
      snapshotPath,
      JSON.stringify({ savedAt: Date.now(), entries }),
      "utf8",
    );
  } catch (error) {
    console.error("Cache snapshot failed", { message: error?.message });
  }
}

async function warmHomepage({ skipFresh = false } = {}) {
  for (const url of homepageSearchUrls()) {
    if (skipFresh && getCachedSearch(url.search, url.searchParams.has("inav"))) {
      continue;
    }

    try {
      const { degraded } = await warmCarList(url);

      if (!degraded) lastGoodBodies.set(url.search, getStaleSearch(url.search));
    } catch (error) {
      console.error("Cache warm-up failed", {
        search: url.search,
        message: error?.message,
      });
    }
  }

  await saveSnapshot();
}

export async function startCacheWarmer() {
  await restoreSnapshot();

  setTimeout(() => warmHomepage({ skipFresh: true }), STARTUP_DELAY_MS).unref?.();
  setInterval(() => warmHomepage(), REFRESH_INTERVAL_MS).unref?.();
}
