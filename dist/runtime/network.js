// src/runtime/network.ts
import { lookup } from "dns/promises";
var inFlightByHost = /* @__PURE__ */ new Map();
async function detectViaPrivateDnsProbe(host, opts = {}) {
  if (typeof host !== "string" || host.length === 0) {
    throw new TypeError(`detectViaPrivateDnsProbe: host must be a non-empty string (got ${typeof host})`);
  }
  const timeoutMs = opts.timeoutMs ?? 1500;
  const existing = inFlightByHost.get(host);
  if (existing) return existing;
  const probe = (async () => {
    let timer;
    try {
      const lookupPromise = lookup(host).then(() => true).catch(() => false);
      const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
        timer.unref?.();
      });
      return await Promise.race([lookupPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
      inFlightByHost.delete(host);
    }
  })();
  inFlightByHost.set(host, probe);
  return probe;
}
function __resetPrivateDnsProbeInFlight() {
  inFlightByHost.clear();
}
export {
  __resetPrivateDnsProbeInFlight,
  detectViaPrivateDnsProbe
};
