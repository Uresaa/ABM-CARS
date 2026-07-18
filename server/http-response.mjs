export function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

export function sendMethodNotAllowed(response) {
  sendJson(response, 405, { error: "Method not allowed" }, { Allow: "GET, HEAD" });
}
