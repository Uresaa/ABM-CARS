const encarListUrl = "https://api.encar.com/search/car/list/general";
const encarReadsideUrl = "https://api.encar.com/v1/readside";
const encarDetailUrl = `${encarReadsideUrl}/vehicle`;
const encarImageUrl = "https://ci.encar.com";

const requestHeaders = {
  Accept: "application/json",
  "User-Agent": "ABM-CARS/1.0",
};

const imageRequestHeaders = {
  "User-Agent": requestHeaders["User-Agent"],
  Referer: "https://www.encar.com/",
};

function requestEncar(url, { headers = requestHeaders, timeoutMs = 15000 } = {}) {
  return fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
}

export function requestCarList(searchParameters) {
  const url = new URL(encarListUrl);

  for (const [name, value] of searchParameters) {
    url.searchParams.set(name, value);
  }

  return requestEncar(url);
}

export function requestCarDetails(carId, { timeoutMs = 15000 } = {}) {
  return requestEncar(`${encarDetailUrl}/${carId}`, { timeoutMs });
}

async function requestOptionalReport(path) {
  try {
    const response = await requestEncar(`${encarReadsideUrl}${path}`, { timeoutMs: 10000 });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

export async function loadAvailableReports(car) {
  const vehicleId = Number(car.vehicleId);
  if (!vehicleId) return null;

  const [accident, inspection, diagnosis] = await Promise.all([
    car.condition?.accident?.recordView
      ? requestOptionalReport(`/record/vehicle/${vehicleId}/summary`)
      : null,
    car.condition?.inspection?.formats?.length
      ? requestOptionalReport(`/inspection/vehicle/${vehicleId}`)
      : null,
    car.advertisement?.diagnosisCar
      ? requestOptionalReport(`/diagnosis/vehicle/${vehicleId}`)
      : null,
  ]);

  return { accident, inspection, diagnosis };
}

export function requestCarImage(imagePath) {
  return requestEncar(`${encarImageUrl}${imagePath}`, { headers: imageRequestHeaders });
}
