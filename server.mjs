import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT) || 4173;
const encarListUrl = "https://api.encar.com/search/car/list/general";
const encarReadsideUrl = "https://api.encar.com/v1/readside";
const encarDetailUrl = `${encarReadsideUrl}/vehicle`;
const encarImageUrl = "https://ci.encar.com";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const requestHeaders = {
  Accept: "application/json",
  "User-Agent": "ABM-CARS/1.0",
};

const imageRequestHeaders = {
  "User-Agent": requestHeaders["User-Agent"],
  Referer: "https://www.encar.com/",
};

const cardFields = [
  "Id",
  "Manufacturer",
  "Model",
  "Badge",
  "FormYear",
  "Mileage",
  "FuelType",
  "OfficeCityState",
  "Photos",
];

function pickCardFields(car) {
  const picked = {};
  for (const field of cardFields) picked[field] = car[field];
  return picked;
}

function fetchUpstream(url, { headers = requestHeaders, timeoutMs = 15000 } = {}) {
  return fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function fetchEncarReport(path) {
  try {
    const response = await fetchUpstream(`${encarReadsideUrl}${path}`, { timeoutMs: 10000 });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

function findInspectionItem(items, code) {
  for (const item of items || []) {
    if (item.type?.code === code) return item;
    const child = findInspectionItem(item.children, code);
    if (child) return child;
  }

  return null;
}

function healthyInspectionItem(items, code) {
  const item = findInspectionItem(items, code);
  if (!item?.statusType) return null;
  return item.statusType.code === "1";
}

function sanitizeAccidentReport(report) {
  if (!report || report.accidentCnt === undefined) return null;

  return {
    accidentCount: Number(report.accidentCnt) || 0,
    myDamageCount: Number(report.myAccidentCnt) || 0,
    otherDamageCount: Number(report.otherAccidentCnt) || 0,
    ownerChangeCount: Number(report.ownerChangeCnt) || 0,
    totalLossCount: Number(report.totalLossCnt) || 0,
    floodCount:
      (Number(report.floodTotalLossCnt) || 0) +
      (Number(report.floodPartLossCnt) || 0),
    theftCount: Number(report.robberCnt) || 0,
  };
}

function sanitizeInspectionReport(report) {
  const master = report?.master;
  const detail = master?.detail;
  if (!master || !detail) return null;

  return {
    accident: typeof master.accdient === "boolean" ? master.accdient : null,
    simpleRepair: typeof master.simpleRepair === "boolean" ? master.simpleRepair : null,
    bodyOk: detail.carStateType ? detail.carStateType.code === "1" : null,
    engineOk: healthyInspectionItem(report.inners, "s001"),
    transmissionOk: healthyInspectionItem(report.inners, "s002"),
    waterDamage: typeof detail.waterlog === "boolean" ? detail.waterlog : null,
    mileage: Number(detail.mileage) || 0,
  };
}

function sanitizeDiagnosisReport(report) {
  if (!Array.isArray(report?.items)) return null;

  const panels = report.items.filter((item) => item.resultCode);
  if (!panels.length) return null;
  const abnormalPanels = panels.filter((item) => item.resultCode !== "NORMAL");

  return {
    panelsChecked: panels.length,
    abnormalPanelCount: abnormalPanels.length,
    allPanelsNormal: abnormalPanels.length === 0,
  };
}

async function getCarReport(car) {
  const vehicleId = Number(car.vehicleId);
  if (!vehicleId) return null;

  const [accident, inspection, diagnosis] = await Promise.all([
    car.condition?.accident?.recordView
      ? fetchEncarReport(`/record/vehicle/${vehicleId}/summary`)
      : null,
    car.condition?.inspection?.formats?.length
      ? fetchEncarReport(`/inspection/vehicle/${vehicleId}`)
      : null,
    car.advertisement?.diagnosisCar
      ? fetchEncarReport(`/diagnosis/vehicle/${vehicleId}`)
      : null,
  ]);

  return {
    accident: sanitizeAccidentReport(accident),
    inspection: sanitizeInspectionReport(inspection),
    diagnosis: sanitizeDiagnosisReport(diagnosis),
  };
}

async function addEnglishCarName(car) {
  try {
    const response = await fetchUpstream(`${encarDetailUrl}/${car.Id}`, { timeoutMs: 8000 });

    if (!response.ok) return car;

    const { category = {} } = await response.json();
    return {
      ...car,
      ManufacturerEnglish: category.manufacturerEnglishName,
      ModelEnglish: category.modelGroupEnglishName,
      BadgeEnglish: category.gradeEnglishName,
    };
  } catch {
    return car;
  }
}

async function proxyCars(url, response) {
  const upstreamUrl = new URL(encarListUrl);

  for (const [name, value] of url.searchParams) {
    upstreamUrl.searchParams.set(name, value);
  }

  const upstreamResponse = await fetchUpstream(upstreamUrl);

  if (!upstreamResponse.ok) {
    sendJson(response, upstreamResponse.status, { error: "Cars could not be loaded" });
    return;
  }

  const data = await upstreamResponse.json();
  data.SearchResults = Array.isArray(data.SearchResults)
    ? await Promise.all(
        data.SearchResults.map((car) => addEnglishCarName(pickCardFields(car))),
      )
    : [];

  sendJson(response, 200, data);
}

async function proxyCarDetail(carId, response) {
  const upstreamResponse = await fetchUpstream(`${encarDetailUrl}/${carId}`);

  if (!upstreamResponse.ok) {
    sendJson(response, upstreamResponse.status, { error: "Car details could not be loaded" });
    return;
  }

  const car = await upstreamResponse.json();
  const category = car.category || {};
  const spec = car.spec || {};
  const report = await getCarReport(car);

  sendJson(response, 200, {
    id: String(carId),
    manufacturer: category.manufacturerEnglishName || category.manufacturerName || "",
    model: category.modelGroupEnglishName || category.modelName || "",
    modelDetail: category.modelName || "",
    grade: category.gradeEnglishName || category.gradeName || "",
    gradeDetail: category.gradeDetailEnglishName || category.gradeDetailName || "",
    year: category.formYear || "",
    registrationMonth: category.yearMonth || "",
    mileage: Number(spec.mileage) || 0,
    displacementCc: Number(spec.displacement) || 0,
    transmission: spec.transmissionName || "",
    fuelType: spec.fuelName || "",
    color: spec.colorName || "",
    seats: Number(spec.seatCount) || 0,
    bodyType: spec.bodyName || "",
    accidentReportAvailable: car.condition?.accident?.recordView === true,
    inspectionAvailable: (car.condition?.inspection?.formats?.length || 0) > 0,
    seizingCount: Number(car.condition?.seizing?.seizingCount) || 0,
    pledgeCount: Number(car.condition?.seizing?.pledgeCount) || 0,
    report,
    photos: Array.isArray(car.photos)
      ? car.photos
          .filter((photo) => typeof photo.path === "string" && photo.path.startsWith("/"))
          .map((photo) => ({
            code: photo.code,
            type: photo.type,
            url: `/api/car-image?path=${encodeURIComponent(photo.path)}`,
          }))
      : [],
  });
}

async function proxyCarImage(url, response) {
  const imagePath = url.searchParams.get("path");

  if (!imagePath || !imagePath.startsWith("/")) {
    sendJson(response, 400, { error: "Invalid image path" });
    return;
  }

  const upstreamResponse = await fetchUpstream(`${encarImageUrl}${imagePath}`, {
    headers: imageRequestHeaders,
  });

  if (!upstreamResponse.ok) {
    sendJson(response, upstreamResponse.status, { error: "Image could not be loaded" });
    return;
  }

  const body = await upstreamResponse.arrayBuffer();
  response.writeHead(200, {
    "Content-Type": upstreamResponse.headers.get("content-type") || "image/jpeg",
    "Cache-Control": "public, max-age=3600",
  });
  response.end(Buffer.from(body));
}

async function serveStaticFile(url, response) {
  const requestedPath = url.pathname === "/" ? "/html/index.html" : url.pathname;
  const decodedPath = decodeURIComponent(requestedPath);
  const filePath = normalize(join(rootDirectory, decodedPath));

  if (!filePath.startsWith(rootDirectory)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  const fileStats = await stat(filePath);
  const resolvedPath = fileStats.isDirectory() ? join(filePath, "index.html") : filePath;
  const body = await readFile(resolvedPath);

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(resolvedPath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const carDetailMatch = url.pathname.match(/^\/api\/cars\/(\d+)$/);

    if (carDetailMatch) {
      await proxyCarDetail(carDetailMatch[1], response);
      return;
    }

    if (url.pathname === "/api/cars") {
      await proxyCars(url, response);
      return;
    }

    if (url.pathname === "/api/car-image") {
      await proxyCarImage(url, response);
      return;
    }

    await serveStaticFile(url, response);
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 502;
    sendJson(response, status, {
      error: status === 404 ? "Not found" : "The upstream service is unavailable",
    });
  }
});

server.listen(port, () => {
  console.log(`ABM CARS is running at http://localhost:${port}/html/index.html`);
});
