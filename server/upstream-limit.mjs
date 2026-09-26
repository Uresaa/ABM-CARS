const FAILURE_THRESHOLD = 5;
const MAX_COOLDOWN_MS = 15 * 60 * 1000;

export class UpstreamUnavailableError extends Error {
  constructor(message = "The upstream service is unavailable") {
    super(message);
    this.name = "UpstreamUnavailableError";
    this.statusCode = 503;
  }
}

export function createLimiter({
  name,
  maxConcurrent,
  minIntervalMs,
  maxQueued,
  initialCooldownMs = 60 * 1000,
}) {
  const queue = [];
  let active = 0;
  let lastStartedAt = 0;
  let startScheduled = false;

  let consecutiveFailures = 0;
  let cooldownMs = initialCooldownMs;
  let circuitOpenUntil = 0;

  function isOpen() {
    return Date.now() < circuitOpenUntil;
  }

  function recordSuccess() {
    consecutiveFailures = 0;
    cooldownMs = initialCooldownMs;
    circuitOpenUntil = 0;
  }

  function openCircuit() {
    consecutiveFailures = 0;
    circuitOpenUntil = Date.now() + cooldownMs;
    console.error("Upstream circuit opened", { name, cooldownMs });
    cooldownMs = Math.min(cooldownMs * 2, MAX_COOLDOWN_MS);
  }

  function recordFailure() {
    if (isOpen()) return;

    if (circuitOpenUntil) {
      openCircuit();
      return;
    }

    consecutiveFailures += 1;
    if (consecutiveFailures < FAILURE_THRESHOLD) return;

    openCircuit();
  }

  function startNext() {
    if (active >= maxConcurrent || !queue.length) return;

    const waitMs = lastStartedAt + minIntervalMs - Date.now();

    if (waitMs > 0) {
      if (startScheduled) return;

      startScheduled = true;
      setTimeout(() => {
        startScheduled = false;
        startNext();
      }, waitMs).unref?.();
      return;
    }

    const queued = queue.shift();
    active += 1;
    lastStartedAt = Date.now();

    Promise.resolve()
      .then(queued.task)
      .then(queued.resolve, queued.reject)
      .finally(() => {
        active -= 1;
        startNext();
      });

    startNext();
  }

  function run(task, { priority = false } = {}) {
    if (isOpen()) {
      return Promise.reject(new UpstreamUnavailableError());
    }

    if (queue.length >= maxQueued) {
      return Promise.reject(
        new UpstreamUnavailableError("Too many pending upstream requests"),
      );
    }

    return new Promise((resolve, reject) => {
      const queued = { task, resolve, reject };

      if (priority) queue.unshift(queued);
      else queue.push(queued);

      startNext();
    });
  }

  return { run, isOpen, recordSuccess, recordFailure };
}
