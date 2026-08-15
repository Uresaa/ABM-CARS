import {
  loadAvailableReports,
  requestCarAcquisitionCost,
  requestCarDetails,
  requestCarImage,
  requestCarList,
} from "./encar-client.mjs";
import {
  createCarDetailsResponse,
  createCarListItem,
  createReportSummary,
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
  setCachedSearch,
  setPendingSearch,
} from "./search-cache.mjs";
import { sendJson } from "./http-response.mjs";

const MAX_CONCURRENT_LIST_ENRICHMENTS = 3;
let activeListEnrichments = 0;
const listEnrichmentQueue = [];

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

async function loadCarListItem(car) {
  const cached = getCachedCategory(car.Id);

  if (
    cached &&
    typeof cached === "object" &&
    "transmission" in cached &&
    "koreaTotalKrw" in cached
  ) {
    return createCarListItem(
      car,
      cached.category,
      cached.transmission,
      cached.koreaTotalKrw,
    );
  }

  const pending = getPendingCategory(car.Id);
  if (pending) return pending;

  return setPendingCategory(
    car.Id,
    (async () => {
      try {
        const response = await requestCarDetails(car.Id, { timeoutMs: 8000 });
        if (!response.ok) return createCarListItem(car);

        const detail = await response.json();
        const category = detail.category || {};
        const transmission = detail.spec?.transmissionName || "";
        const koreaTotalKrw = await requestCarAcquisitionCost(detail);

        setCachedCategory(car.Id, { category, transmission, koreaTotalKrw });
        return createCarListItem(car, category, transmission, koreaTotalKrw);
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
    error.statusCode = encarResponse.status;
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

  data.SearchResults = uniqueCars.length
    ? await Promise.all(
        uniqueCars.map((car) =>
          enqueueListEnrichment(() => loadCarListItem(car)),
        ),
      )
    : [];

  return data;
}

export async function handleCarListRequest(url, response) {
  const cacheKey = url.search;
  const cached = getCachedSearch(cacheKey);

  if (cached) {
    sendJson(response, 200, cached);
    return;
  }

  const pending = getPendingSearch(cacheKey);
  if (pending) {
    try {
      sendJson(response, 200, await pending);
    } catch (error) {
      sendJson(response, error.statusCode || 502, {
        error: "Cars could not be loaded",
      });
    }
    return;
  }

  const request = setPendingSearch(cacheKey, loadCarList(url.searchParams));

  try {
    const data = await request;
    setCachedSearch(cacheKey, data);
    sendJson(response, 200, data);
  } catch (error) {
    sendJson(response, error.statusCode || 502, {
      error: "Cars could not be loaded",
    });
  }
}

export async function handleCarDetailRequest(carId, response) {
  const encarResponse = await requestCarDetails(carId);

  if (!encarResponse.ok) {
    sendJson(response, encarResponse.status, {
      error: "Car details could not be loaded",
    });
    return;
  }

  const car = await encarResponse.json();
  const [reports, koreaTotalKrw] = await Promise.all([
    loadAvailableReports(car),
    requestCarAcquisitionCost(car),
  ]);
  const report = createReportSummary(reports);
  const carDetails = createCarDetailsResponse(
    carId,
    car,
    report,
    koreaTotalKrw,
  );

  sendJson(response, 200, carDetails);
}

export async function handleCarImageRequest(url, response) {
  const imagePath = url.searchParams.get("path");

  if (!imagePath || !imagePath.startsWith("/")) {
    sendJson(response, 400, { error: "Invalid image path" });
    return;
  }

  const encarResponse = await requestCarImage(imagePath);

  if (!encarResponse.ok) {
    sendJson(response, encarResponse.status, {
      error: "Image could not be loaded",
    });
    return;
  }

  const body = await encarResponse.arrayBuffer();
  response.writeHead(200, {
    "Content-Type": encarResponse.headers.get("content-type") || "image/jpeg",
    "Cache-Control": "public, max-age=3600",
  });
  response.end(Buffer.from(body));
}
