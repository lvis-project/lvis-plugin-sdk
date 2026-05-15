/**
 * `detectViaPrivateDnsProbe` — does the OS resolver know about a host that
 * only exists on a private network (corporate intranet, VPN, lab subnet)?
 *
 * Mechanism: `node:dns/promises.lookup(host)` with a `Promise.race` deadline.
 * On-corp DNS resolves the host (typically RFC1918 private IP); off-corp DNS
 * returns `ENOTFOUND`. The async asymmetry is the signal.
 *
 * Use cases:
 *   - Pre-gate an SSO BrowserView so it does not pop on external networks.
 *     (Plugins wrap and throw a domain-specific error on `false`.)
 *   - Auto-route MSAL tenants between corporate vs external endpoints.
 *     (ms-graph pattern — advisory, not a hard gate.)
 *
 * Design decisions:
 *   - No module-level cache. corp↔off-corp transitions in both directions
 *     are common (VPN connect/disconnect, leaving the office); a sticky
 *     cache defeats the gate in one direction or the other. OS DNS cache
 *     handles perf (≤1ms hit).
 *   - `inFlight` dedup only — concurrent callers on the same tick share
 *     one in-flight probe instead of issuing N lookups.
 *   - Fail-safe to `false` on timeout. Slow corp DNS = false-negative is
 *     preferred over slow user gate.
 *
 * This is a UX hint, NOT a trust boundary. A local DNS spoof or split-DNS
 * environment can return `true` from an attacker-controlled probe. Plugins
 * must enforce real trust at the cookie/origin level downstream.
 *
 * Ported from `lvis-plugin-ms-graph/src/corpNetworkDetector.ts` (advisory
 * use) + `lvis-plugin-lge-api/src/corpNetworkDetector.ts` (hard pre-gate).
 * Each plugin previously shipped its own copy with the hostname hardcoded;
 * the SDK promotion keeps the company-specific host (`newep.lge.com`) out
 * of SDK source so the SDK stays open-source-clean.
 */

import { lookup } from "node:dns/promises";

export interface PrivateDnsProbeOptions {
  /** Race deadline before falling through to `false`. Default 1500ms. */
  timeoutMs?: number;
}

const inFlightByHost = new Map<string, Promise<boolean>>();

export async function detectViaPrivateDnsProbe(
  host: string,
  opts: PrivateDnsProbeOptions = {},
): Promise<boolean> {
  if (typeof host !== "string" || host.length === 0) {
    throw new TypeError(`detectViaPrivateDnsProbe: host must be a non-empty string (got ${typeof host})`);
  }
  const timeoutMs = opts.timeoutMs ?? 1500;

  // Same-tick dedup keyed by host — concurrent callers share one probe.
  const existing = inFlightByHost.get(host);
  if (existing) return existing;

  const probe = (async () => {
    let timer: NodeJS.Timeout | undefined;
    try {
      const lookupPromise = lookup(host).then(() => true).catch(() => false);
      const timeoutPromise = new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
        // unref — timer must not delay process exit / keep the event loop alive.
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

/** Test seam — clears any in-flight probe state. NOT for production use. */
export function __resetPrivateDnsProbeInFlight(): void {
  inFlightByHost.clear();
}
