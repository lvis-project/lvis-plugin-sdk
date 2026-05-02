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
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-chat-theme");
  document.documentElement.removeAttribute("data-code-theme");
  document.documentElement.style.cssText = "";
});

describe("useTheme", () => {
  it("subscribes to host.theme.changed", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    expect(bridge.onEvent).toHaveBeenCalledWith("host.theme.changed", expect.any(Function));
  });

  it("sets data-theme on event", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({ theme: "light", chatTheme: "default", codeTheme: "light" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("sets data-chat-theme for non-default value", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({ theme: "dark", chatTheme: "purple", codeTheme: "dark" });
    expect(document.documentElement.getAttribute("data-chat-theme")).toBe("purple");
  });

  it("removes data-chat-theme when chatTheme is 'default'", () => {
    document.documentElement.setAttribute("data-chat-theme", "purple");
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({ theme: "dark", chatTheme: "default", codeTheme: "dark" });
    expect(document.documentElement.hasAttribute("data-chat-theme")).toBe(false);
  });

  it("sets data-code-theme", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({ theme: "dark", chatTheme: "default", codeTheme: "light" });
    expect(document.documentElement.getAttribute("data-code-theme")).toBe("light");
  });

  it("applies only --lvis-* tokens, drops non-prefixed keys", () => {
    const bridge = makeBridge();
    renderHook(() => useTheme(bridge));
    bridge.fire({
      theme: "light", chatTheme: "default", codeTheme: "light",
      tokens: { "--lvis-bg": "#ffffff", "--evil-key": "bad", "color": "red" },
    });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("#ffffff");
    expect(document.documentElement.style.getPropertyValue("--evil-key")).toBe("");
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
});
