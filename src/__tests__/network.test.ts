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

  it("timeout-wins-race does NOT release the dedup slot — second caller arriving after the timeout shares the same in-flight lookup", async () => {
    // Lookup hangs forever — timeout wins. After the first probe resolves
    // (via timeout=false), a second caller within the same lookup window
    // must still see the SAME pending lookup, not fan out to a 2nd one.
    let resolveLookup: (v: { address: string; family: number }) => void = () => {};
    mockLookup.mockReturnValueOnce(
      new Promise((res) => {
        resolveLookup = res;
      }) as unknown as Promise<{ address: string; family: number }>,
    );

    const r1 = await detectViaPrivateDnsProbe("slow.example.com", { timeoutMs: 30 });
    expect(r1).toBe(false); // timeout fail-safe

    // Second caller arrives BEFORE the underlying lookup has settled.
    const p2 = detectViaPrivateDnsProbe("slow.example.com", { timeoutMs: 30 });

    // Resolve the underlying lookup AFTER p2 is awaiting — both should see
    // it, but more importantly mock-lookup must have been called exactly
    // once across both probes.
    resolveLookup({ address: "10.0.0.1", family: 4 });
    await p2;

    expect(mockLookup).toHaveBeenCalledTimes(1);
  });
});
