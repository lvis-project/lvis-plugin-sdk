import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { RefObject } from "react";

const activate = vi.fn();
const deactivate = vi.fn();
const createFocusTrap = vi.fn(
  (_node: HTMLElement, _opts: Record<string, unknown>) => ({ activate, deactivate }),
);

vi.mock("focus-trap", () => ({
  createFocusTrap: (node: HTMLElement, opts: Record<string, unknown>) =>
    createFocusTrap(node, opts),
}));

import { useFocusTrap } from "../hooks/useFocusTrap.js";

beforeEach(() => {
  activate.mockClear();
  deactivate.mockClear();
  createFocusTrap.mockClear();
});

function setupRef(): { current: HTMLElement } {
  const node = document.createElement("div");
  document.body.appendChild(node);
  return { current: node };
}

describe("useFocusTrap", () => {
  it("activates the trap when active=true and ref.current is set", () => {
    const ref = setupRef();
    renderHook(() => useFocusTrap(ref as RefObject<HTMLElement>, true));
    expect(createFocusTrap).toHaveBeenCalledOnce();
    expect(activate).toHaveBeenCalledOnce();
    expect(deactivate).not.toHaveBeenCalled();
  });

  it("deactivates the trap on unmount", () => {
    const ref = setupRef();
    const { unmount } = renderHook(() => useFocusTrap(ref as RefObject<HTMLElement>, true));
    unmount();
    expect(deactivate).toHaveBeenCalledOnce();
  });

  it("does not activate when active=false", () => {
    const ref = setupRef();
    renderHook(() => useFocusTrap(ref as RefObject<HTMLElement>, false));
    expect(createFocusTrap).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
  });

  it("does not activate when ref.current is null", () => {
    const ref = useRefHelper();
    renderHook(() => useFocusTrap(ref, true));
    expect(createFocusTrap).not.toHaveBeenCalled();
  });

  it("forwards initialFocus and allowOutsideClick options to focus-trap", () => {
    const ref = setupRef();
    const initialFocus = document.createElement("button");
    renderHook(() =>
      useFocusTrap(ref as RefObject<HTMLElement>, true, {
        initialFocus,
        allowOutsideClick: false,
      }),
    );
    expect(createFocusTrap).toHaveBeenCalledOnce();
    const opts = createFocusTrap.mock.calls[0]![1];
    expect(opts.initialFocus).toBe(initialFocus);
    expect(opts.allowOutsideClick).toBe(false);
  });

  it("uses sane defaults when options omitted (no escape/click-outside auto-deactivate)", () => {
    const ref = setupRef();
    renderHook(() => useFocusTrap(ref as RefObject<HTMLElement>, true));
    const opts = createFocusTrap.mock.calls[0]![1];
    expect(opts.escapeDeactivates).toBe(false);
    expect(opts.clickOutsideDeactivates).toBe(false);
    expect(opts.returnFocusOnDeactivate).toBe(true);
    expect(opts.allowOutsideClick).toBe(true);
    expect(opts.fallbackFocus).toBe(ref.current);
  });

  it("warns and returns silently when createFocusTrap throws", () => {
    const ref = setupRef();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    createFocusTrap.mockImplementationOnce(() => {
      throw new Error("trap setup failure");
    });
    expect(() =>
      renderHook(() => useFocusTrap(ref as RefObject<HTMLElement>, true)),
    ).not.toThrow();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(deactivate).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

function useRefHelper(): RefObject<HTMLElement | null> {
  // Helper to expose a null-ref outside of a renderHook callback —
  // mirrors how a consumer would pass `useRef<HTMLElement>(null)` whose
  // current is set later by a JSX `ref` attribute.
  return { current: null } as RefObject<HTMLElement | null>;
}
