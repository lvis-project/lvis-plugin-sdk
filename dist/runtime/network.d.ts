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
 *     (Advisory — soft signal, not a hard gate.)
 *
 * Design decisions:
 *   - No module-level cache. corp↔off-corp transitions in both directions
 *     are common (VPN connect/disconnect, leaving the office); a sticky
 *     cache defeats the gate in one direction or the other. OS DNS cache
 *     handles perf (≤1ms hit).
 *   - `inFlight` dedup keyed by host. The entry's lifetime is tied to the
 *     UNDERLYING `dns.lookup` settling, not the timeout-race outcome —
 *     otherwise a timeout-winning race releases the dedup slot while
 *     libuv's getaddrinfo is still running, and retry-loop callers fan
 *     out to multiple concurrent lookups against slow DNS.
 *     **Observable consequence**: while a lookup is in flight (slow DNS,
 *     dropped packet, etc.) subsequent callers receive the SAME race
 *     outcome — typically `false` on a timeout-winning first call. New
 *     fresh probes can only start after the underlying lookup finally
 *     settles. This matches the "fail-safe under slow DNS" intent.
 *   - Fail-safe to `false` on timeout. Slow corp DNS = false-negative is
 *     preferred over a slow user gate.
 *   - Per-tsup-bundle module state: each plugin embeds its own copy of
 *     this module (splitting:false), so dedup is per-bundle, not truly
 *     process-global. That's intentional — callers in different plugins
 *     don't need to share a Map for any correctness reason.
 *
 * This is a UX hint, NOT a trust boundary. A local DNS spoof or split-DNS
 * environment can return `true` from an attacker-controlled probe. Plugins
 * must enforce real trust at the cookie/origin level downstream.
 *
 * Note on error class: SDK ships the mechanism only. Each consumer keeps
 * its own domain-specific error class (e.g. lge-api's `NonCorpNetworkError`
 * with a Korean message + IPC-stable code). Promoting a generic
 * `PrivateDnsProbeRequiredError` was considered and rejected — only one
 * of the two current consumers actually throws, and the wording / code
 * surface is company-specific.
 *
 * Caller responsibility: this module does NOT abort the underlying
 * `dns.lookup` when the timeout fires (Node's `node:dns/promises` does
 * not accept an AbortSignal for `lookup` as of Node 25). Retry-loop
 * callers should apply their own backoff so they don't queue many
 * concurrent libuv `getaddrinfo` requests against a perma-slow DNS.
 */
export interface PrivateDnsProbeOptions {
    /** Race deadline before falling through to `false`. Default 1500ms. */
    timeoutMs?: number;
}
export declare function detectViaPrivateDnsProbe(host: string, opts?: PrivateDnsProbeOptions): Promise<boolean>;
/** @internal Test seam — production code MUST NOT call this. */
export declare function __resetPrivateDnsProbeInFlightForTests(): void;
//# sourceMappingURL=network.d.ts.map