import { createServer } from "node:http";
import { sendJson, sendMethodNotAllowed } from "./server/http-response.mjs";
import { servePublicFile } from "./server/public-files.mjs";
import {
  handleCarDetailRequest,
  handleCarImageRequest,
  handleCarListRequest,
} from "./server/request-handlers.mjs";

const port = Number(process.env.PORT) || 4173;

const server = createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendMethodNotAllowed(response);
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const carDetailMatch = url.pathname.match(/^\/api\/cars\/(\d+)$/);

    if (carDetailMatch) {
      await handleCarDetailRequest(carDetailMatch[1], response);
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

    await servePublicFile(url, response);
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 502;

    if (status === 502) {
      console.error(error);
    }

    sendJson(response, status, {
      error: status === 404 ? "Not found" : "The upstream service is unavailable",
    });
  }
});

server.listen(port, () => {
  console.log(`ABM CARS is running at http://localhost:${port}/html/index.html`);
});
