import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LVIS_TOKEN_NAMES, LVIS_CSS_ONLY_TOKEN_NAMES } from "../tokens/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const JSON_PATH = join(ROOT, "src/ui/tokens/fallback-dark.json");
const GENERATED_TS = join(ROOT, "src/ui/tokens/_generated-fallback-css.ts");
const GENERATED_CSS = join(ROOT, "src/ui/tokens/lvis-tokens.css");

const parsed = JSON.parse(readFileSync(JSON_PATH, "utf8")) as {
  tokens: Record<string, string>;
  cssOnly?: Record<string, string>;
};

const jsonTokens = Object.keys(parsed.tokens).filter((k) => !k.startsWith("_"));
const jsonCssOnly = Object.keys(parsed.cssOnly ?? {}).filter((k) => !k.startsWith("_"));

describe("fallback-dark.json — single SoT", () => {
  it("JSON token keys are exactly LVIS_TOKEN_NAMES (no missing, no extra)", () => {
    const expected = [...LVIS_TOKEN_NAMES].sort();
    const actual = [...jsonTokens].sort();
    expect(actual).toEqual(expected);
  });

  it("JSON cssOnly keys are exactly LVIS_CSS_ONLY_TOKEN_NAMES", () => {
    const expected = [...LVIS_CSS_ONLY_TOKEN_NAMES].sort();
    const actual = [...jsonCssOnly].sort();
    expect(actual).toEqual(expected);
  });

  it("generated _FALLBACK_CSS contains every JSON token value (drift gate)", () => {
    const ts = readFileSync(GENERATED_TS, "utf8");
    for (const [key, value] of Object.entries(parsed.tokens)) {
      if (key.startsWith("_")) continue;
      expect(ts).toContain(`${key}: `);
      expect(ts).toContain(value);
    }
  });

  it("generated lvis-tokens.css contains every JSON token value (drift gate)", () => {
    const css = readFileSync(GENERATED_CSS, "utf8");
    for (const [key, value] of Object.entries(parsed.tokens)) {
      if (key.startsWith("_")) continue;
      expect(css).toContain(`${key}: `);
      expect(css).toContain(value);
    }
  });
});
