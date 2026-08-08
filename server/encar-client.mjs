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

export async function requestCarAcquisitionCost(car, { timeoutMs = 10000 } = {}) {
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

  const response = await requestEncar(url, { timeoutMs });
  if (!response.ok) return 0;

  const data = JSON.parse(
    new TextDecoder("euc-kr").decode(await response.arrayBuffer()),
  );
  return Number(data?.[0]?.acquisition?.totalPrice) || 0;
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
