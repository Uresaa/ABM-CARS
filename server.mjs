import { createServer } from "node:http";
import { sendJson, sendMethodNotAllowed } from "./server/http-response.mjs";
import { servePublicFile } from "./server/public-files.mjs";
import {
  handleCarDetailRequest,
  handleCarImageRequest,
  handleCarListRequest,
} from "./server/request-handlers.mjs";
import { clientKey, isRateLimited } from "./server/rate-limit.mjs";
import { startCacheWarmer } from "./server/cache-warmer.mjs";

const port = Number(process.env.PORT) || 4173;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception", error);
});

const server = createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendMethodNotAllowed(response);
      return;
    }

    const url = new URL(
      request.url,
      `http://${request.headers.host || "localhost"}`,
    );

    if (url.pathname.startsWith("/api/") && isRateLimited(clientKey(request))) {
      sendJson(
        response,
        429,
        { error: "Too many requests" },
        { "Retry-After": "60" },
      );
      return;
    }

    const carDetailMatch = url.pathname.match(/^\/api\/cars\/(\d+)$/);

    if (carDetailMatch) {
      await handleCarDetailRequest(carDetailMatch[1], response);
      return;
    }

    const carDetailsPageMatch = url.pathname.match(/^\/car-details\/(\d+)\/?$/);

    if (carDetailsPageMatch) {
      url.pathname = "/html/car-details.html";
      await servePublicFile(url, request, response);
      return;
    }

    if (url.pathname === "/api/cars") {
      await handleCarListRequest(url, response);
      return;
    }

    if (url.pathname === "/api/car-image") {
      await handleCarImageRequest(url, response);
      return;
    }

    if (url.pathname === "/") {
      url.pathname = "/html/index.html";
    }
    await servePublicFile(url, request, response);
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : error?.statusCode || 502;

    if (status !== 404) {
      console.error("Request failed", {
        url: request.url,
        message: error?.message,
        cause: error?.cause?.message,
        code: error?.cause?.code || error?.code,
        hostname: error?.cause?.hostname,
      });
    }

    if (response.headersSent) {
      response.end();
      return;
    }

    sendJson(response, status, {
      error:
        status === 404 ? "Not found" : "The upstream service is unavailable",
    });
  }
});

server.requestTimeout = 45000;
server.headersTimeout = 20000;
server.keepAliveTimeout = 65000;

server.listen(port, () => {
  console.log(
    `ABM CARS is running at http://localhost:${port}/html/index.html`,
  );
  startCacheWarmer().catch((error) => {
    console.error("Cache warmer failed to start", error);
  });
});
