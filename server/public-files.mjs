import { readFile, realpath, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { sendJson } from "./http-response.mjs";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const publicDirectories = ["html", "css", "js", "images"].map((directory) =>
  resolve(projectDirectory, directory),
);

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

function isPublicFile(filePath) {
  return publicDirectories.some(
    (directory) => filePath === directory || filePath.startsWith(`${directory}${sep}`),
  );
}

export async function servePublicFile(url, response) {
  if (url.pathname === "/") {
    response.writeHead(302, { Location: "/html/index.html" });
    response.end();
    return;
  }

  const requestedPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const filePath = resolve(projectDirectory, requestedPath);

  if (!isPublicFile(filePath)) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  const fileStats = await stat(filePath);
  const requestedFile = fileStats.isDirectory() ? resolve(filePath, "index.html") : filePath;
  const resolvedPath = await realpath(requestedFile);

  if (!isPublicFile(resolvedPath)) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  const body = await readFile(resolvedPath);

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(resolvedPath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  response.end(body);
}
