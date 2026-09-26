import {
  loadAvailableReports,
  requestAccidentSummary,
  requestCarAcquisitionCost,
  isVehicleCircuitOpen,
  requestCarDetails,
  requestCarImage,
  requestCarList,
} from "./encar-client.mjs";
import {
  createCarDetailsResponse,
  createCarListItem,
  createReportSummary,
  evaluateAccidentFree,
} from "./car-response.mjs";
import {
  getCachedCategory,
  getPendingCategory,
  setCachedCategory,
  setPendingCategory,
} from "./car-cache.mjs";
import {
  getCachedSearch,
  getPendingSearch,
  getStaleSearch,
  setCachedSearch,
  setPendingSearch,
} from "./search-cache.mjs";
import {
  getCachedDetail,
  getPendingDetail,
  getStaleDetail,
  setCachedDetail,
  setPendingDetail,
} from "./detail-cache.mjs";
import { createTtlCache } from "./ttl-cache.mjs";
import { sendJson, sendJsonText } from "./http-response.mjs";

const MAX_CONCURRENT_LIST_ENRICHMENTS = 3;
const LIST_ENRICHMENT_BUDGET_MS = 6000;
const DEGRADED_LISTING_TTL_MS = 60 * 1000;
const IMAGE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const IMAGE_CACHE_MAX_ENTRIES = 120;

let activeListEnrichments = 0;
const listEnrichmentQueue = [];

const images = createTtlCache({
  ttlMs: IMAGE_CACHE_TTL_MS,
  maxEntries: IMAGE_CACHE_MAX_ENTRIES,
});

function enqueueListEnrichment(task) {
  return new Promise((resolve, reject) => {
    listEnrichmentQueue.push({ task, resolve, reject });
    runNextListEnrichment();
  });
}

function runNextListEnrichment() {
  if (activeListEnrichments >= MAX_CONCURRENT_LIST_ENRICHMENTS) return;

  const queued = listEnrichmentQueue.shift();
  if (!queued) return;

  activeListEnrichments += 1;
  Promise.resolve()
    .then(queued.task)
    .then(queued.resolve, queued.reject)
    .finally(() => {
      activeListEnrichments -= 1;
      runNextListEnrichment();
    });
}

function isEnrichedCategory(cached) {
  return (
    cached &&
    typeof cached === "object" &&
    "transmission" in cached &&
    "koreaTotalKrw" in cached
  );
}

async function loadCarListItem(car, deadline, enrichment) {
  const cached = getCachedCategory(car.Id);

  if (isEnrichedCategory(cached)) {
    return createCarListItem(
      car,
      cached.category,
      cached.transmission,
      cached.koreaTotalKrw,
      cached.accidentFree,
    );
  }

  const pending = getPendingCategory(car.Id);
  if (pending) return pending;

  if (Date.now() > deadline || isVehicleCircuitOpen()) {
    enrichment.skipped += 1;
    return createCarListItem(car);
  }

  return setPendingCategory(
    car.Id,
    (async () => {
      try {
        const response = await requestCarDetails(car.Id, { timeoutMs: 8000 });
        if (!response.ok) return createCarListItem(car);

        const detail = await response.json();
        const category = detail.category || {};
        const transmission = detail.spec?.transmissionName || "";
        const [koreaTotalKrw, accidentSummary] = await Promise.all([
          requestCarAcquisitionCost(detail),
          requestAccidentSummary(detail),
        ]);
        const accidentFree = evaluateAccidentFree(accidentSummary);

        setCachedCategory(car.Id, {
          category,
          transmission,
          koreaTotalKrw,
          accidentFree,
        });
        return createCarListItem(
          car,
          category,
          transmission,
          koreaTotalKrw,
          accidentFree,
        );
      } catch {
        return createCarListItem(car);
      }
    })(),
  );
}

async function loadCarList(searchParameters) {
  const encarResponse = await requestCarList(searchParameters);

  if (!encarResponse.ok) {
    const error = new Error("Cars could not be loaded");
    error.statusCode = 503;
    throw error;
  }

  const data = await encarResponse.json();
  const uniqueCars = Array.isArray(data.SearchResults)
    ? Array.from(
        new Map(
          data.SearchResults
            .filter((car) => car?.Id)
            .map((car) => [String(car.Id), car]),
        ).values(),
      )
    : [];
  const deadline = Date.now() + LIST_ENRICHMENT_BUDGET_MS;
  const enrichment = { skipped: 0 };

  data.SearchResults = uniqueCars.length
    ? await Promise.all(
        uniqueCars.map((car) =>
          enqueueListEnrichment(() => loadCarListItem(car, deadline, enrichment)),
        ),
      )
    : [];

  return { body: JSON.stringify(data), degraded: enrichment.skipped > 0 };
}

export async function handleCarListRequest(url, response) {
  const cacheKey = url.search;
  const isMetadata = url.searchParams.has("inav");
  const browserCacheHeaders = {
    "Cache-Control": isMetadata ? "public, max-age=1800" : "public, max-age=60",
  };
  const cached = getCachedSearch(cacheKey, isMetadata);

  if (cached) {
    sendJsonText(response, 200, cached, browserCacheHeaders);
    return;
  }

  try {
    const { body, degraded } = await (getPendingSearch(cacheKey) ??
      setPendingSearch(cacheKey, loadCarList(url.searchParams)));

    setCachedSearch(cacheKey, body, degraded ? DEGRADED_LISTING_TTL_MS : undefined);
    sendJsonText(response, 200, body, browserCacheHeaders);
  } catch (error) {
    const stale = getStaleSearch(cacheKey);

    if (stale) {
      sendJsonText(response, 200, stale, {
        "Cache-Control": "public, max-age=30",
      });
      return;
    }

    sendJson(
      response,
      error.statusCode || 503,
      { error: "Cars could not be loaded" },
      { "Retry-After": "30" },
    );
  }
}

async function loadCarDetails(carId) {
  const encarResponse = await requestCarDetails(carId, { priority: true });

  if (!encarResponse.ok) {
    const error = new Error("Car details could not be loaded");
    error.statusCode = encarResponse.status === 404 ? 404 : 503;
    throw error;
  }

  const car = await encarResponse.json();
  const [reports, koreaTotalKrw] = await Promise.all([
    loadAvailableReports(car, { priority: true }),
    requestCarAcquisitionCost(car, { priority: true }),
  ]);
  const report = createReportSummary(reports);

  return createCarDetailsResponse(carId, car, report, koreaTotalKrw);
}

export async function handleCarDetailRequest(carId, response) {
  const browserCacheHeaders = { "Cache-Control": "public, max-age=300" };
  const cached = getCachedDetail(carId);

  if (cached) {
    sendJsonText(response, 200, cached, browserCacheHeaders);
    return;
  }

  try {
    const body = await (getPendingDetail(carId) ??
      setPendingDetail(
        carId,
        loadCarDetails(carId).then((details) => JSON.stringify(details)),
      ));

    setCachedDetail(carId, body);
    sendJsonText(response, 200, body, browserCacheHeaders);
  } catch (error) {
    const stale = getStaleDetail(carId);

    if (stale) {
      sendJsonText(response, 200, stale, {
        "Cache-Control": "public, max-age=30",
      });
      return;
    }

    sendJson(
      response,
      error.statusCode || 503,
      { error: "Car details could not be loaded" },
      { "Retry-After": "30" },
    );
  }
}

function sendImage(response, image) {
  response.writeHead(200, {
    "Content-Type": image.contentType,
    "Content-Length": image.body.length,
    "Cache-Control": "public, max-age=604800, immutable",
  });
  response.end(image.body);
}

async function loadCarImage(imagePath) {
  const encarResponse = await requestCarImage(imagePath);

  if (!encarResponse.ok) {
    const error = new Error("Image could not be loaded");
    error.statusCode = encarResponse.status;
    throw error;
  }

  return {
    body: Buffer.from(await encarResponse.arrayBuffer()),
    contentType: encarResponse.headers.get("content-type") || "image/jpeg",
  };
}

export async function handleCarImageRequest(url, response) {
  const imagePath = url.searchParams.get("path");

  if (!imagePath || !imagePath.startsWith("/") || imagePath.includes("..")) {
    sendJson(response, 400, { error: "Invalid image path" });
    return;
  }

  const cached = images.get(imagePath);

  if (cached) {
    sendImage(response, cached);
    return;
  }

  try {
    const image = await (images.getPending(imagePath) ??
      images.setPending(imagePath, loadCarImage(imagePath)));

    images.set(imagePath, image);
    sendImage(response, image);
  } catch (error) {
    const stale = images.getStale(imagePath);

    if (stale) {
      sendImage(response, stale);
      return;
    }

    sendJson(response, error.statusCode || 502, {
      error: "Image could not be loaded",
    });
  }
}

export async function warmCarList(url) {
  const cacheKey = url.search;

  const { body, degraded } = await (getPendingSearch(cacheKey) ??
    setPendingSearch(cacheKey, loadCarList(url.searchParams)));

  setCachedSearch(cacheKey, body, degraded ? DEGRADED_LISTING_TTL_MS : undefined);

  return { body, degraded };
}
