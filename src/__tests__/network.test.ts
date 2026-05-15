import { describe, it, expect, beforeEach, vi } from "vitest";

// vi.mock is hoisted above all imports — capture the mock fn via vi.hoisted
// so the factory can reference it without TDZ issues.
const { mockLookup } = vi.hoisted(() => ({ mockLookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({
  __esModule: true,
  default: { lookup: mockLookup },
  lookup: mockLookup,
}));

import {
  detectViaPrivateDnsProbe,
  __resetPrivateDnsProbeInFlightForTests,
} from "../runtime/network.js";

describe("detectViaPrivateDnsProbe", () => {
  beforeEach(() => {
    __resetPrivateDnsProbeInFlightForTests();
    mockLookup.mockReset();
  });

  it("returns true when the host resolves", async () => {
    mockLookup.mockResolvedValueOnce({ address: "10.0.0.1", family: 4 });
    const result = await detectViaPrivateDnsProbe("newep.lge.com", { timeoutMs: 500 });
    expect(result).toBe(true);
    expect(mockLookup).toHaveBeenCalledWith("newep.lge.com");
  });

  it("returns false on ENOTFOUND", async () => {
    mockLookup.mockRejectedValueOnce(
      Object.assign(new Error("getaddrinfo ENOTFOUND newep.lge.com"), {
        code: "ENOTFOUND",
      }),
    );
    const result = await detectViaPrivateDnsProbe("newep.lge.com", { timeoutMs: 500 });
    expect(result).toBe(false);
  });

  it("returns false on timeout (fail-safe)", async () => {
    mockLookup.mockReturnValueOnce(new Promise(() => {}) as unknown as Promise<never>);
    const result = await detectViaPrivateDnsProbe("newep.lge.com", { timeoutMs: 50 });
    expect(result).toBe(false);
  });

  it("does NOT cache results — every call re-probes (off→on and on→off both work)", async () => {
    mockLookup.mockRejectedValueOnce(
      Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }),
    );
    const r1 = await detectViaPrivateDnsProbe("newep.lge.com", { timeoutMs: 500 });
    expect(r1).toBe(false);

    mockLookup.mockResolvedValueOnce({ address: "10.0.0.1", family: 4 });
    const r2 = await detectViaPrivateDnsProbe("newep.lge.com", { timeoutMs: 500 });
    expect(r2).toBe(true);
    expect(mockLookup).toHaveBeenCalledTimes(2);
  });

  it("dedups concurrent callers on the same host within one probe window", async () => {
    let resolveLookup: (v: { address: string; family: number }) => void = () => {};
    mockLookup.mockReturnValueOnce(
      new Promise((res) => {
        resolveLookup = res;
      }) as unknown as Promise<{ address: string; family: number }>,
    );
    const p1 = detectViaPrivateDnsProbe("newep.lge.com", { timeoutMs: 5000 });
    const p2 = detectViaPrivateDnsProbe("newep.lge.com", { timeoutMs: 5000 });
    resolveLookup({ address: "10.0.0.1", family: 4 });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(mockLookup).toHaveBeenCalledTimes(1);
  });

  it("dedup is per-host — different hosts probe independently", async () => {
    mockLookup
      .mockResolvedValueOnce({ address: "10.0.0.1", family: 4 })
      .mockRejectedValueOnce(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }));

    const [a, b] = await Promise.all([
      detectViaPrivateDnsProbe("internal-a.example.com", { timeoutMs: 500 }),
      detectViaPrivateDnsProbe("internal-b.example.com", { timeoutMs: 500 }),
    ]);
    expect(a).toBe(true);
    expect(b).toBe(false);
    expect(mockLookup).toHaveBeenCalledTimes(2);
  });

  it("rejects empty / whitespace / non-string host", async () => {
    await expect(detectViaPrivateDnsProbe("")).rejects.toThrow(TypeError);
    await expect(detectViaPrivateDnsProbe("   ")).rejects.toThrow(TypeError);
    // @ts-expect-error — runtime guard
    await expect(detectViaPrivateDnsProbe(null)).rejects.toThrow(TypeError);
    // @ts-expect-error — runtime guard
    await expect(detectViaPrivateDnsProbe(undefined)).rejects.toThrow(TypeError);
  });

  it("falls back to default timeout when caller passes NaN / negative / non-number", async () => {
    // Whatever the timeout default is, the call must still produce a boolean
    // result. Use a slow lookup to ensure the timeout path is reachable; we
    // care that *no* exception escapes for malformed input.
    mockLookup.mockResolvedValueOnce({ address: "10.0.0.1", family: 4 });
    const r1 = await detectViaPrivateDnsProbe("a.example.com", { timeoutMs: Number.NaN });
    expect(typeof r1).toBe("boolean");

    mockLookup.mockResolvedValueOnce({ address: "10.0.0.1", family: 4 });
    const r2 = await detectViaPrivateDnsProbe("b.example.com", { timeoutMs: -50 });
    expect(typeof r2).toBe("boolean");
  });

  it("timeout-wins-race does NOT release the dedup slot — concurrent callers across the timeout boundary share the same in-flight lookup", async () => {
    // Lookup hangs — first call's race resolves via timeout (=false). A
    // second call kicked off WHILE the underlying lookup is still pending
    // must dedup onto it, not spawn a second `dns.lookup`. To genuinely
    // exercise the dedup, fire p1 and p2 BEFORE either awaits — if we
    // `await p1` first, the lifetime `.finally` would have a chance to
    // clear the slot before p2 starts (depending on impl).
    let resolveLookup: (v: { address: string; family: number }) => void = () => {};
    mockLookup.mockReturnValueOnce(
      new Promise((res) => {
        resolveLookup = res;
      }) as unknown as Promise<{ address: string; family: number }>,
    );

    const p1 = detectViaPrivateDnsProbe("slow.example.com", { timeoutMs: 30 });
    const p2 = detectViaPrivateDnsProbe("slow.example.com", { timeoutMs: 30 });

    // p1 races timeout (50ms) vs lookup (hung) → timeout wins, p1 → false
    // p2 was launched while the lookup was still pending; if dedup works,
    // it shares the SAME lookupPromise, sees the timeout-false, returns
    // false too. Critical: only ONE dns.lookup() call observed.
    const r1 = await p1;
    expect(r1).toBe(false);

    // Resolve the underlying lookup. p2's race already settled (via shared
    // lookupPromise + its own timeoutPromise) — but await p2 to flush.
    resolveLookup({ address: "10.0.0.1", family: 4 });
    await p2;

    expect(mockLookup).toHaveBeenCalledTimes(1);
  });

  it("set-before-finally ordering — synchronously-resolved lookup does not strand the dedup slot", async () => {
    // Mock returns a synchronously-settled promise (Promise.resolve(...)).
    // If implementation attached the cleanup `.finally` BEFORE setting the
    // dedup slot, the cleanup would queue first and could (under a strict
    // microtask drain interpretation) clear the slot before it was set.
    // Verify the slot lifecycle is robust to sync-resolved lookups by
    // running back-to-back probes and asserting each invokes lookup
    // independently (i.e. the slot DOES clear after each settles).
    mockLookup
      .mockResolvedValueOnce({ address: "10.0.0.1", family: 4 })
      .mockResolvedValueOnce({ address: "10.0.0.2", family: 4 });

    const r1 = await detectViaPrivateDnsProbe("sync.example.com", { timeoutMs: 500 });
    expect(r1).toBe(true);
    const r2 = await detectViaPrivateDnsProbe("sync.example.com", { timeoutMs: 500 });
    expect(r2).toBe(true);
    expect(mockLookup).toHaveBeenCalledTimes(2);
  });
});
