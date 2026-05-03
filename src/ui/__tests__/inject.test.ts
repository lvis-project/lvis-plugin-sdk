import { describe, it, expect, beforeEach } from "vitest";
import { applyThemeTokens, injectTokenCss } from "../tokens/inject.js";

beforeEach(() => {
  document.documentElement.style.cssText = "";
  document.head.querySelectorAll("style[id]").forEach((el) => el.remove());
});

describe("applyThemeTokens", () => {
  it("applies known --lvis-* token", () => {
    applyThemeTokens({ "--lvis-bg": "#ffffff" });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("#ffffff");
  });

  it("drops unknown key", () => {
    applyThemeTokens({ "--evil-key": "red" });
    expect(document.documentElement.style.getPropertyValue("--evil-key")).toBe("");
  });

  it("drops url() injection value", () => {
    applyThemeTokens({ "--lvis-bg": "url(https://evil.com?x=1)" });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("");
  });

  it("drops expression() injection value", () => {
    applyThemeTokens({ "--lvis-bg": "expression(alert(1))" });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("");
  });

  it("drops HTML tag injection value", () => {
    applyThemeTokens({ "--lvis-bg": "<script>alert(1)</script>" });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("");
  });

  it("allows safe values like hex, hsl, var()", () => {
    applyThemeTokens({ "--lvis-bg": "#0f0f13" });
    expect(document.documentElement.style.getPropertyValue("--lvis-bg")).toBe("#0f0f13");
    applyThemeTokens({ "--lvis-fg": "hsl(0 0% 95%)" });
    expect(document.documentElement.style.getPropertyValue("--lvis-fg")).toBe("hsl(0 0% 95%)");
  });

  it("does not block CSS math expressions without HTML tags", () => {
    applyThemeTokens({ "--lvis-radius": "clamp(0.25rem, 1vw, 0.5rem)" });
    expect(document.documentElement.style.getPropertyValue("--lvis-radius")).toBe("clamp(0.25rem, 1vw, 0.5rem)");
  });
});

describe("injectTokenCss", () => {
  it("injects a style tag with the given id", () => {
    injectTokenCss("test-style", ":root { --x: 1; }");
    expect(document.getElementById("test-style")?.textContent).toBe(":root { --x: 1; }");
  });

  it("updates content on re-inject (HMR)", () => {
    injectTokenCss("test-style", ":root { --x: 1; }");
    injectTokenCss("test-style", ":root { --x: 2; }");
    expect(document.getElementById("test-style")?.textContent).toBe(":root { --x: 2; }");
    expect(document.head.querySelectorAll("#test-style").length).toBe(1);
  });
});
