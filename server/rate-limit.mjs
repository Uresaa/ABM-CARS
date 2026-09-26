const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 300;
const MAX_TRACKED_CLIENTS = 5000;

const clients = new Map();

export function clientKey(request) {
  const forwarded = request.headers["x-forwarded-for"];
  const forwardedClient = forwarded?.split(",")[0]?.trim();

  return forwardedClient || request.socket.remoteAddress || "unknown";
}

export function isRateLimited(key) {
  const now = Date.now();
  const entry = clients.get(key);

  if (!entry || now - entry.windowStartedAt > WINDOW_MS) {
    clients.delete(key);
    clients.set(key, { windowStartedAt: now, count: 1 });

    while (clients.size > MAX_TRACKED_CLIENTS) {
      clients.delete(clients.keys().next().value);
    }

    return false;
  }

  entry.count += 1;

  return entry.count > MAX_REQUESTS_PER_WINDOW;
}
