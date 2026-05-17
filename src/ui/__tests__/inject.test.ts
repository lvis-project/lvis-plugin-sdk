import { describe, it, expect, beforeEach, vi } from "vitest";

type InjectModule = typeof import("../tokens/inject.js");
let mod: InjectModule;

beforeEach(async () => {
  document.documentElement.style.cssText = "";
  document.head.querySelectorAll("style[id]").forEach((el) => el.remove());
  // Reset the module cache so each case re-imports `tokens/inject.js`
  // cleanly. The "no longer exports `ensureFallback`" assertion below
  // needs the fresh module export shape.
  vi.resetModules();
  mod = await import("../tokens/inject.js");
});

describe("applyThemeTokens", () => {
  it("applies known --lvis-* token", () => {
    mod.applyThemeTokens({ "--lvis-bg": "#ffffff" });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("#ffffff");
  });

  it("drops unknown key", () => {
    mod.applyThemeTokens({ "--evil-key": "red" });
    expect(document.documentElement.style.getPropertyValue("--evil-key")).toBe("");
  });

  it("drops url() injection value", () => {
    mod.applyThemeTokens({ "--lvis-bg": "url(https://evil.com?x=1)" });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("");
  });

  it("drops expression() injection value", () => {
    mod.applyThemeTokens({ "--lvis-bg": "expression(alert(1))" });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("");
  });

  it("drops HTML tag injection value", () => {
    mod.applyThemeTokens({ "--lvis-bg": "<script>alert(1)</script>" });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("");
  });

  it("allows safe values like hex, hsl, var()", () => {
    mod.applyThemeTokens({ "--lvis-bg": "#0f0f13" });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("#0f0f13");
    mod.applyThemeTokens({ "--lvis-fg": "hsl(0 0% 95%)" });
    expect(document.documentElement.style.getPropertyValue("--lvis-fg")).toBe("hsl(0 0% 95%)");
  });

  it("does not block CSS math expressions without HTML tags", () => {
    mod.applyThemeTokens({ "--lvis-radius": "clamp(0.25rem, 1vw, 0.5rem)" });
    expect(document.documentElement.style.getPropertyValue("--lvis-radius")).toBe("clamp(0.25rem, 1vw, 0.5rem)");
  });
});

describe("injectTokenCss", () => {
  it("injects a style tag with the given id", () => {
    mod.injectTokenCss("test-style", ":root { --x: 1; }");
    expect(document.getElementById("test-style")?.textContent).toBe(":root { --x: 1; }");
  });

  it("updates content on re-inject (HMR)", () => {
    mod.injectTokenCss("test-style", ":root { --x: 1; }");
    mod.injectTokenCss("test-style", ":root { --x: 2; }");
    expect(document.getElementById("test-style")?.textContent).toBe(":root { --x: 2; }");
    expect(document.head.querySelectorAll("#test-style").length).toBe(1);
  });
});

describe("applyThemeFromHostEvent", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme-bundle");
    document.documentElement.removeAttribute("data-shell");
    document.documentElement.style.cssText = "";
  });

  it("sets data-theme-bundle and data-shell on valid event", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    applyThemeFromHostEvent({ bundleId: "tokyo-night", shell: "dark", tokens: {} as never });
    expect(document.documentElement.getAttribute("data-theme-bundle")).toBe("tokyo-night");
    expect(document.documentElement.getAttribute("data-shell")).toBe("dark");
  });

  it("removes attributes on null event", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    document.documentElement.setAttribute("data-theme-bundle", "midnight");
    document.documentElement.setAttribute("data-shell", "dark");
    applyThemeFromHostEvent(null);
    expect(document.documentElement.hasAttribute("data-theme-bundle")).toBe(false);
    expect(document.documentElement.hasAttribute("data-shell")).toBe(false);
  });

  it("removes data-theme-bundle for unknown bundleId", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    document.documentElement.setAttribute("data-theme-bundle", "old-bundle");
    // Cast to bypass TS type so we can test runtime guard
    applyThemeFromHostEvent({ bundleId: "unknown-bundle" as never, shell: "dark", tokens: {} as never });
    expect(document.documentElement.hasAttribute("data-theme-bundle")).toBe(false);
  });

  it("removes data-shell for invalid shell value", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    document.documentElement.setAttribute("data-shell", "dark");
    applyThemeFromHostEvent({ bundleId: "forest", shell: "high-contrast" as never, tokens: {} as never });
    expect(document.documentElement.hasAttribute("data-shell")).toBe(false);
  });

  it("applies tokens via applyThemeTokens (allowlist + unsafe guard enforced)", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    applyThemeFromHostEvent({
      bundleId: "violet-light",
      shell: "light",
      tokens: { "--lvis-bg": "#ffffff", "--lvis-fg": "#000000" } as never,
    });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("#ffffff");
    expect(document.documentElement.style.getPropertyValue("--lvis-fg")).toBe("#000000");
  });

  it("accepts all LVIS_THEME_BUNDLE_IDS values", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    const { LVIS_THEME_BUNDLE_IDS } = await import("../tokens/index.js");
    for (const bundleId of LVIS_THEME_BUNDLE_IDS) {
      document.documentElement.removeAttribute("data-theme-bundle");
      applyThemeFromHostEvent({ bundleId, shell: "dark", tokens: {} as never });
      expect(document.documentElement.getAttribute("data-theme-bundle")).toBe(bundleId);
    }
  });

  it("does not throw when tokens is null — silent skip", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    expect(() =>
      applyThemeFromHostEvent({ bundleId: "midnight", shell: "dark", tokens: null as never })
    ).not.toThrow();
  });

  it("does not throw when tokens is undefined — silent skip", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    expect(() =>
      applyThemeFromHostEvent({ bundleId: "midnight", shell: "dark", tokens: undefined as never })
    ).not.toThrow();
  });

  it("does not throw when tokens is an array — silent skip", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    expect(() =>
      applyThemeFromHostEvent({ bundleId: "midnight", shell: "dark", tokens: [] as never })
    ).not.toThrow();
  });

  it("does not throw when tokens is an empty object — no properties set", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    const before = document.documentElement.style.getPropertyValue("--lvis-bg");
    expect(() =>
      applyThemeFromHostEvent({ bundleId: "midnight", shell: "dark", tokens: {} as never })
    ).not.toThrow();
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe(before);
  });

  it("null reset removes all inline --lvis-* token styles (Major #2)", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    const { LVIS_TOKEN_NAMES } = await import("../tokens/index.js");
    // First apply some tokens via a valid event
    applyThemeFromHostEvent({
      bundleId: "midnight",
      shell: "dark",
      tokens: { "--lvis-bg": "#0f0f13", "--lvis-fg": "#cdd6f4", "--lvis-primary": "#89b4fa" } as never,
    });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("#0f0f13");
    expect(document.documentElement.style.getPropertyValue("--lvis-fg")).toBe("#cdd6f4");
    expect(document.documentElement.style.getPropertyValue("--lvis-primary")).toBe("#89b4fa");
    // Now null reset — all token inline styles must be removed
    applyThemeFromHostEvent(null);
    for (const tokenName of LVIS_TOKEN_NAMES) {
      expect(document.documentElement.style.getPropertyValue(tokenName)).toBe("");
    }
  });

  it("null reset removes attrs even when previously set", async () => {
    const { applyThemeFromHostEvent } = await import("../tokens/inject.js");
    document.documentElement.setAttribute("data-theme-bundle", "midnight");
    document.documentElement.setAttribute("data-shell", "dark");
    applyThemeFromHostEvent(null);
    expect(document.documentElement.hasAttribute("data-theme-bundle")).toBe(false);
    expect(document.documentElement.hasAttribute("data-shell")).toBe(false);
  });
});

describe("injectTokenCss — no automatic fallback <style> (#667 cleanup)", () => {
  // The pre-broadcast fallback `<style id="lvis-tokens-fallback">` was deleted
  // along with `_FALLBACK_CSS` / `fallback-dark.json`. The race window the
  // fallback compensated for (plugin webview paint before the host's first
  // `host.theme.changed` broadcast) is closed by
  // `lvis-app/src/main.ts:initialThemeArgs` (lvis-app commit `1696f92`) —
  // every BrowserWindow's webPreferences.additionalArguments carry the host's
  // primed token payload so plugins paint correctly from frame 0 without any
  // SDK-side fallback. `injectTokenCss` now writes only the caller's CSS.
  it("does NOT auto-inject a #lvis-tokens-fallback <style>", () => {
    expect(document.getElementById("lvis-tokens-fallback")).toBeNull();
    mod.injectTokenCss("c1", ":root { --x: 1; }");
    expect(document.getElementById("lvis-tokens-fallback")).toBeNull();
  });

  it("writes ONLY the caller-supplied CSS, leaving any host-managed fallback element untouched", () => {
    const pre = document.createElement("style");
    pre.id = "lvis-tokens-fallback";
    pre.textContent = ":root { --lvis-bg: hostvalue; }";
    document.head.appendChild(pre);
    mod.injectTokenCss("c1", ":root { --x: 1; }");
    expect(pre.textContent).toBe(":root { --lvis-bg: hostvalue; }");
    expect(document.getElementById("c1")?.textContent).toBe(":root { --x: 1; }");
  });

  it("no longer exports `ensureFallback` (consumer API removed)", () => {
    expect((mod as Record<string, unknown>).ensureFallback).toBeUndefined();
  });
});
