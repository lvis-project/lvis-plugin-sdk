// src/runtime/network.ts
import { lookup } from "dns/promises";

// src/runtime/_test-env.ts
function assertTestEnvironment(name) {
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production" && !process.env.VITEST && !process.env.LVIS_TEST) {
    throw new Error(
      `${name}: test seam called in production. Use vitest, set LVIS_TEST=1, or remove the call.`
    );
  }
}

// src/runtime/network.ts
var inFlightByHost = /* @__PURE__ */ new Map();
var DEFAULT_TIMEOUT_MS = 1500;
async function detectViaPrivateDnsProbe(host, opts = {}) {
  if (typeof host !== "string" || host.trim().length === 0) {
    throw new TypeError(
      `detectViaPrivateDnsProbe: host must be a non-empty string (got ${typeof host === "string" ? "empty/whitespace string" : typeof host})`
    );
  }
  const raw = opts.timeoutMs;
  const timeoutMs = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
  const existing = inFlightByHost.get(host);
  if (existing) return existing;
  let timer;
  const lookupPromise = Promise.resolve().then(() => lookup(host)).then(() => true).catch(() => false);
  void lookupPromise.finally(() => {
    inFlightByHost.delete(host);
  });
  const probe = (async () => {
    try {
      const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
        timer.unref?.();
      });
      return await Promise.race([lookupPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();
  inFlightByHost.set(host, probe);
  return probe;
}
function __resetPrivateDnsProbeInFlightForTests() {
  assertTestEnvironment("__resetPrivateDnsProbeInFlightForTests");
  inFlightByHost.clear();
}
export {
  __resetPrivateDnsProbeInFlightForTests,
  detectViaPrivateDnsProbe
};
