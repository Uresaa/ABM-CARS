export function sendJson(response, status, payload, headers = {}) {
  sendJsonText(response, status, JSON.stringify(payload), headers);
}

export function sendJsonText(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(body);
}

export function sendMethodNotAllowed(response) {
  sendJson(response, 405, { error: "Method not allowed" }, { Allow: "GET, HEAD" });
}
