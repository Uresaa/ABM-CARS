import {
  loadAvailableReports,
  requestCarDetails,
  requestCarImage,
  requestCarList,
} from "./encar-client.mjs";
import {
  createCarDetailsResponse,
  createCarListItem,
  createReportSummary,
} from "./car-response.mjs";
import { getCachedCategory, setCachedCategory } from "./car-cache.mjs";
import { sendJson } from "./http-response.mjs";

async function loadCarListItem(car) {
  const cached = getCachedCategory(car.Id);

  if (cached && typeof cached === "object" && "transmission" in cached) {
    return createCarListItem(car, cached.category, cached.transmission);
  }

  try {
    const response = await requestCarDetails(car.Id, { timeoutMs: 8000 });
    if (!response.ok) return createCarListItem(car);

    const detail = await response.json();
    const category = detail.category || {};
    const transmission = detail.spec?.transmissionName || "";

    setCachedCategory(car.Id, { category, transmission });
    return createCarListItem(car, category, transmission);
  } catch {
    return createCarListItem(car);
  }
}

export async function handleCarListRequest(url, response) {
  const encarResponse = await requestCarList(url.searchParams);

  if (!encarResponse.ok) {
    sendJson(response, encarResponse.status, {
      error: "Cars could not be loaded",
    });
    return;
  }

  const data = await encarResponse.json();
  data.SearchResults = Array.isArray(data.SearchResults)
    ? await Promise.all(data.SearchResults.map(loadCarListItem))
    : [];

  sendJson(response, 200, data);
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
  const reports = await loadAvailableReports(car);
  const report = createReportSummary(reports);
  const carDetails = createCarDetailsResponse(carId, car, report);

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
