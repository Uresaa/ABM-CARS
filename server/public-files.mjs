import { readFile, realpath, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { sendJson } from "./http-response.mjs";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const publicDirectories = ["html", "css", "js", "images"].map((directory) =>
  resolve(projectDirectory, directory),
);
const publicFiles = ["robots.txt", "sitemap.xml"].map((file) =>
  resolve(projectDirectory, file),
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
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

const IMMUTABLE_EXTENSIONS = new Set([".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const REVALIDATED_EXTENSIONS = new Set([".html", ".txt", ".xml"]);

function cacheControl(extension) {
  if (REVALIDATED_EXTENSIONS.has(extension)) return "public, max-age=0, must-revalidate";
  if (IMMUTABLE_EXTENSIONS.has(extension)) return "public, max-age=604800";
  return "public, max-age=300";
}

function isPublicFile(filePath) {
  return (
    publicFiles.includes(filePath) ||
    publicDirectories.some(
      (directory) => filePath === directory || filePath.startsWith(`${directory}${sep}`),
    )
  );
}

export async function servePublicFile(url, request, response) {
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

  const resolvedStats = await stat(resolvedPath);
  const extension = extname(resolvedPath).toLowerCase();
  const etag = `W/"${resolvedStats.size.toString(36)}-${Math.trunc(resolvedStats.mtimeMs).toString(36)}"`;
  const headers = {
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Cache-Control": cacheControl(extension),
    ETag: etag,
  };

  if (request.headers["if-none-match"] === etag) {
    response.writeHead(304, headers);
    response.end();
    return;
  }

  const body = await readFile(resolvedPath);

  response.writeHead(200, { ...headers, "Content-Length": body.length });
  response.end(body);
}
