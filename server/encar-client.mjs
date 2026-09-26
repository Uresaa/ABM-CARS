import { createLimiter } from "./upstream-limit.mjs";

const encarListUrl = "https://api.encar.com/search/car/list/general";
const encarReadsideUrl = "https://api.encar.com/v1/readside";
const encarDetailUrl = `${encarReadsideUrl}/vehicle`;
const encarCalculatorUrl = "https://www.encar.com/dc/dc_carsearchpop.do";
const encarImageUrl = "https://ci.encar.com";

const requestHeaders = {
  Accept: "application/json",
  "User-Agent": "ABM-CARS/1.0",
};

const imageRequestHeaders = {
  "User-Agent": requestHeaders["User-Agent"],
  Referer: "https://www.encar.com/",
};

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

const searchLimiter = createLimiter({
  name: "search",
  maxConcurrent: 1,
  minIntervalMs: 1000,
  maxQueued: 25,
  initialCooldownMs: 3 * 60 * 1000,
});

const metadataLimiter = createLimiter({
  name: "metadata",
  maxConcurrent: 4,
  minIntervalMs: 150,
  maxQueued: 100,
  initialCooldownMs: 2 * 60 * 1000,
});

const vehicleLimiter = createLimiter({
  name: "vehicle",
  maxConcurrent: 6,
  minIntervalMs: 60,
  maxQueued: 150,
});

const imageLimiter = createLimiter({
  name: "image",
  maxConcurrent: 8,
  minIntervalMs: 30,
  maxQueued: 200,
});

export function isVehicleCircuitOpen() {
  return vehicleLimiter.isOpen();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function recordResponse(limiter, response) {
  if (response.ok || response.status === 404) {
    if (response.ok) limiter.recordSuccess();
    return;
  }

  limiter.recordFailure();
}

async function fetchWithRetries(limiter, url, headers, timeoutMs, retries) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!RETRYABLE_STATUSES.has(response.status) || attempt >= retries) {
        recordResponse(limiter, response);
        return response;
      }
    } catch (error) {
      if (attempt >= retries) {
        limiter.recordFailure();
        throw error;
      }
    }

    await delay(300 * (attempt + 1));
  }
}

function requestEncar(
  url,
  {
    headers = requestHeaders,
    timeoutMs = 15000,
    retries = 2,
    priority = false,
    limiter = vehicleLimiter,
  } = {},
) {
  return limiter.run(
    () => fetchWithRetries(limiter, url, headers, timeoutMs, retries),
    { priority },
  );
}

export function requestCarList(searchParameters, { priority = false } = {}) {
  const url = new URL(encarListUrl);

  for (const [name, value] of searchParameters) {
    url.searchParams.set(name, value);
  }

  const limiter = url.searchParams.has("inav") ? metadataLimiter : searchLimiter;

  return requestEncar(url, { priority, limiter, retries: 1 });
}

export function requestCarDetails(carId, { timeoutMs = 15000, priority = false } = {}) {
  return requestEncar(`${encarDetailUrl}/${carId}`, { timeoutMs, priority });
}

export async function requestCarAcquisitionCost(
  car,
  { timeoutMs = 10000, priority = false } = {},
) {
  const vehicleId = Number(car.vehicleId);
  if (!vehicleId) return 0;

  const url = new URL(encarCalculatorUrl);
  url.search = new URLSearchParams({
    method: "getCarCalcJson",
    carid: String(vehicleId),
    isLease: "",
    isBuyback: "",
    carType: "dc",
    aqprice: String(car.advertisement?.price || ""),
    regist: "0",
    carTypeCode: "",
    purpose: "",
    isHomeService: "",
    advertisementType: car.advertisement?.advertisementType || "",
    encarServiceType: "",
    centerCode: "",
  }).toString();

  try {
    const response = await requestEncar(url, { timeoutMs, priority });
    if (!response.ok) return 0;

    const data = JSON.parse(
      new TextDecoder("euc-kr").decode(await response.arrayBuffer()),
    );
    return Number(data?.[0]?.acquisition?.totalPrice) || 0;
  } catch {
    return 0;
  }
}

async function requestOptionalReport(path, { priority = false } = {}) {
  try {
    const response = await requestEncar(`${encarReadsideUrl}${path}`, {
      timeoutMs: 10000,
      priority,
    });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

export async function requestAccidentSummary(car, { priority = false } = {}) {
  const vehicleId = Number(car.vehicleId);
  if (!vehicleId || !car.condition?.accident?.recordView) return null;

  return requestOptionalReport(`/record/vehicle/${vehicleId}/summary`, { priority });
}

export async function loadAvailableReports(car, { priority = false } = {}) {
  const vehicleId = Number(car.vehicleId);
  if (!vehicleId) return null;

  const [accident, inspection, diagnosis] = await Promise.all([
    requestAccidentSummary(car, { priority }),
    car.condition?.inspection?.formats?.length
      ? requestOptionalReport(`/inspection/vehicle/${vehicleId}`, { priority })
      : null,
    car.advertisement?.diagnosisCar
      ? requestOptionalReport(`/diagnosis/vehicle/${vehicleId}`, { priority })
      : null,
  ]);

  return { accident, inspection, diagnosis };
}

export function requestCarImage(imagePath) {
  return requestEncar(`${encarImageUrl}${imagePath}`, {
    headers: imageRequestHeaders,
    retries: 1,
    limiter: imageLimiter,
  });
}
