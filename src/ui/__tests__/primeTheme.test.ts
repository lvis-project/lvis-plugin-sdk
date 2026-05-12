import { describe, it, expect, vi, beforeEach } from "vitest";
import { primeTheme } from "../hooks/primeTheme.js";
import type { LvisHostThemeEvent } from "../tokens/index.js";

function makeBridge(opts: { withGetTheme?: () => Promise<LvisHostThemeEvent | null> } = {}) {
  let captured: ((data: unknown) => void) | undefined;
  const unsub = vi.fn();
  return {
    onEvent: vi.fn((type: string, handler: (data: unknown) => void) => {
      if (type === "host.theme.changed") captured = handler;
      return unsub;
    }),
    getTheme: opts.withGetTheme,
    fire: (data: unknown) => captured?.(data),
    unsub,
  };
}

const VALID: LvisHostThemeEvent = {
  bundleId: "tokyo-night",
  shell: "dark",
  tokens: { "--lvis-bg": "#1a1b26" } as never,
};

beforeEach(() => {
  document.documentElement.removeAttribute("data-theme-bundle");
  document.documentElement.removeAttribute("data-shell");
  document.documentElement.style.cssText = "";
});

describe("primeTheme", () => {
  it("subscribes to host.theme.changed", () => {
    const bridge = makeBridge();
    primeTheme(bridge);
    expect(bridge.onEvent).toHaveBeenCalledWith("host.theme.changed", expect.any(Function));
  });

  it("applies broadcast payload to documentElement by default", () => {
    const bridge = makeBridge();
    primeTheme(bridge);
    bridge.fire(VALID);
    expect(document.documentElement.getAttribute("data-theme-bundle")).toBe("tokyo-night");
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("#1a1b26");
  });

  it("pulls via getTheme and applies the result", async () => {
    const bridge = makeBridge({
      withGetTheme: () => Promise.resolve(VALID),
    });
    primeTheme(bridge);
    // Let microtasks run
    await Promise.resolve();
    await Promise.resolve();
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("#1a1b26");
  });

  it("skips pull silently when getTheme is absent (no throw)", () => {
    const bridge = makeBridge();
    expect(() => primeTheme(bridge)).not.toThrow();
  });

  it("scopes apply to opts.target HTMLElement (does not touch documentElement)", () => {
    const bridge = makeBridge();
    const root = document.createElement("div");
    document.body.appendChild(root);
    primeTheme(bridge, { target: root });
    bridge.fire(VALID);
    expect(root.style.getPropertyValue("--lvis-bg")).toBe("#1a1b26");
    // documentElement should NOT receive the token when target is a sub-element
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("");
  });

  it("invokes onPayload AFTER the SDK has applied tokens", () => {
    const calls: string[] = [];
    const bridge = makeBridge();
    primeTheme(bridge, {
      onPayload: (e) => calls.push(`onPayload:${e.bundleId}`),
    });
    bridge.fire(VALID);
    expect(calls).toEqual(["onPayload:tokyo-night"]);
    // SDK-applied attr is present before the callback would clear it
    expect(document.documentElement.getAttribute("data-theme-bundle")).toBe("tokyo-night");
  });

  it("catches errors thrown by onPayload — does not break the theme path", () => {
    const bridge = makeBridge();
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    primeTheme(bridge, {
      onPayload: () => { throw new Error("callback bug"); },
    });
    expect(() => bridge.fire(VALID)).not.toThrow();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("onPayload callback threw"),
      expect.any(Error),
    );
    spy.mockRestore();
  });

  it("dispose() unsubscribes from host.theme.changed", () => {
    const bridge = makeBridge();
    const handle = primeTheme(bridge);
    handle.dispose();
    expect(bridge.unsub).toHaveBeenCalledTimes(1);
  });

  it("does not throw on null payload", () => {
    const bridge = makeBridge();
    primeTheme(bridge);
    expect(() => bridge.fire(null)).not.toThrow();
  });

  it("rejected getTheme is non-fatal — subscription still works", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bridge = makeBridge({
      withGetTheme: () => Promise.reject(new Error("ipc denied")),
    });
    primeTheme(bridge);
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("getTheme() pull failed"),
      expect.any(Error),
    );
    // Subsequent broadcast still flows
    bridge.fire(VALID);
    expect(document.documentElement.getAttribute("data-theme-bundle")).toBe("tokyo-night");
    spy.mockRestore();
  });
});
