import { describe, it, expect, beforeEach, vi } from "vitest";

type InjectModule = typeof import("../tokens/inject.js");
let mod: InjectModule;

beforeEach(async () => {
  document.documentElement.style.cssText = "";
  document.head.querySelectorAll("style[id]").forEach((el) => el.remove());
  // `_fallbackEnsured` is module-level state — reset between tests so each
  // case starts with a fresh ensure-on-first-call gate.
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

describe("ensureFallback (gate semantics — 3.10.1)", () => {
  it("first injectTokenCss call ensures the :root fallback <style>", () => {
    expect(document.getElementById("lvis-tokens-fallback")).toBeNull();
    mod.injectTokenCss("c1", ":root { --x: 1; }");
    const fb = document.getElementById("lvis-tokens-fallback");
    expect(fb).not.toBeNull();
    expect(fb?.textContent).toContain("--lvis-bg:");
    expect(fb?.textContent).toContain("--lvis-radius:");
  });

  it("multiple injectTokenCss calls produce exactly one fallback <style>", () => {
    mod.injectTokenCss("c1", ":root { --x: 1; }");
    mod.injectTokenCss("c2", ":root { --y: 2; }");
    mod.injectTokenCss("c3", ":root { --z: 3; }");
    expect(document.head.querySelectorAll("#lvis-tokens-fallback").length).toBe(1);
  });

  it("preserves a pre-existing #lvis-tokens-fallback (host-injected) without overwrite", () => {
    const pre = document.createElement("style");
    pre.id = "lvis-tokens-fallback";
    pre.textContent = ":root { --lvis-bg: hostvalue; }";
    document.head.appendChild(pre);
    mod.injectTokenCss("c1", ":root { --x: 1; }");
    const fb = document.getElementById("lvis-tokens-fallback");
    expect(fb?.textContent).toBe(":root { --lvis-bg: hostvalue; }");
    expect(document.head.querySelectorAll("#lvis-tokens-fallback").length).toBe(1);
  });

  it("ensureFallback() is idempotent — repeated calls no-op", () => {
    mod.ensureFallback();
    mod.ensureFallback();
    mod.ensureFallback();
    expect(document.head.querySelectorAll("#lvis-tokens-fallback").length).toBe(1);
  });
});
