import { describe, it, expect } from "vitest";
import {
  findLvisTokenReferences,
  findLvisTokenDefinitions,
  validateTokenUsage,
  validateTokenDefinitions,
} from "../tokens/validate.js";

describe("findLvisTokenReferences", () => {
  it("extracts each --lvis-* token referenced via var(...)", () => {
    const css = `.x { color: var(--lvis-fg); background: var(--lvis-bg); }`;
    expect([...findLvisTokenReferences(css)].sort()).toEqual(["--lvis-bg", "--lvis-fg"]);
  });

  it("ignores non-lvis CSS variables", () => {
    const css = `.x { color: var(--lvis-fg); padding: var(--my-spacing); }`;
    expect([...findLvisTokenReferences(css)]).toEqual(["--lvis-fg"]);
  });

  it("dedupes repeated references", () => {
    const css = `.a { color: var(--lvis-fg); } .b { color: var(--lvis-fg); }`;
    expect([...findLvisTokenReferences(css)]).toEqual(["--lvis-fg"]);
  });

  it("tolerates whitespace inside var()", () => {
    expect([...findLvisTokenReferences("var(   --lvis-bg )")]).toEqual(["--lvis-bg"]);
  });

  it("ignores --lvis-* inside CSS block comments", () => {
    const css = `/* var(--lvis-typo) */ .x { color: var(--lvis-fg); }`;
    expect([...findLvisTokenReferences(css)]).toEqual(["--lvis-fg"]);
  });

  it("ignores --lvis-* inside string literals", () => {
    const css = `.x::before { content: "var(--lvis-typo)"; color: var(--lvis-fg); }`;
    expect([...findLvisTokenReferences(css)]).toEqual(["--lvis-fg"]);
  });

  it("captures uppercase references with original case (catches casing typos)", () => {
    expect([...findLvisTokenReferences("var(--LVIS-BG)")]).toEqual(["--LVIS-BG"]);
    expect([...findLvisTokenReferences("var(--Lvis-bg)")]).toEqual(["--Lvis-bg"]);
  });

  it("flags --lvis-* outside string when comment chain breaks the apparent string", () => {
    // Per CSS parser: `/* "abc */` is a complete comment, so `var(--lvis-typo)`
    // between the two comments is real code — the validator must surface it.
    const r = findLvisTokenReferences(`/* "abc */ var(--lvis-typo) /* abc" */`);
    expect([...r]).toEqual(["--lvis-typo"]);
  });

  it("does NOT flag --lvis-* inside a string that contains comment-like sequences", () => {
    // The string `"/* var(--lvis-typo) */"` is a CSS string literal whose
    // content includes `/*`. CSS strips comments before strings would even
    // matter; either order yields the same outcome here — strip the comment
    // first (eats up to the inner `*/`) → no quote pair → no string strip
    // needed → bare reference removed in the comment-eat. Lock the behavior.
    const css = `.x::before { content: "/* var(--lvis-typo) */"; color: var(--lvis-fg); }`;
    expect([...findLvisTokenReferences(css)]).toEqual(["--lvis-fg"]);
  });
});

describe("findLvisTokenDefinitions edge cases", () => {
  it("captures every same-line declaration when delimiters share a single `;`", () => {
    // Regression guard: anchor `(?:^|[{};])` consumes the preceding char,
    // but the next `;` (between same-line declarations) still anchors the
    // following match. All three must be captured.
    const css = `:root{--lvis-a:1;--lvis-b:2;--lvis-c:3}`;
    expect([...findLvisTokenDefinitions(css)].sort()).toEqual([
      "--lvis-a", "--lvis-b", "--lvis-c",
    ]);
  });
});

describe("findLvisTokenDefinitions", () => {
  it("extracts each --lvis-* token defined as a CSS declaration", () => {
    const css = `:root { --lvis-bg: #fff; --lvis-fg: #000; }`;
    expect([...findLvisTokenDefinitions(css)].sort()).toEqual(["--lvis-bg", "--lvis-fg"]);
  });

  it("does not match inside var() refs", () => {
    expect([...findLvisTokenDefinitions(".a { color: var(--lvis-fg); }")]).toEqual([]);
  });
});

describe("validateTokenUsage", () => {
  it("ok=true when every reference is in the allowlist", () => {
    const css = `.x { background: var(--lvis-bg); color: var(--lvis-fg); }`;
    const r = validateTokenUsage(css);
    expect(r).toEqual({ ok: true, unknown: [] });
  });

  it("ok=false and lists unknown refs alphabetically", () => {
    const css = `.x { color: var(--lvis-typo); border: var(--lvis-zzz); background: var(--lvis-bg); }`;
    const r = validateTokenUsage(css);
    expect(r.ok).toBe(false);
    expect(r.unknown).toEqual(["--lvis-typo", "--lvis-zzz"]);
  });

  it("accepts a custom allowlist (for SDK-internal experiments)", () => {
    const css = `.x { color: var(--lvis-experimental); }`;
    const r = validateTokenUsage(css, new Set(["--lvis-experimental"]));
    expect(r.ok).toBe(true);
  });

  it("flags a case-mismatched reference (--LVIS-bg vs allowlisted --lvis-bg)", () => {
    const r = validateTokenUsage(`.x { color: var(--LVIS-bg); }`);
    expect(r.ok).toBe(false);
    expect(r.unknown).toEqual(["--LVIS-bg"]);
  });
});

describe("validateTokenDefinitions", () => {
  it("flags every --lvis-* definition by default (plugin code MUST NOT redefine)", () => {
    const css = `:root { --lvis-bg: #fff; }`;
    const r = validateTokenDefinitions(css);
    expect(r.ok).toBe(false);
    expect(r.forbiddenRedefinitions).toEqual(["--lvis-bg"]);
    expect(r.unknown).toEqual([]);
  });

  it("with allowDefinitions=true still flags unknown names", () => {
    const css = `:root { --lvis-bg: #fff; --lvis-typo: red; }`;
    const r = validateTokenDefinitions(css, { allowDefinitions: true });
    expect(r.ok).toBe(false);
    expect(r.unknown).toEqual(["--lvis-typo"]);
    expect(r.forbiddenRedefinitions).toEqual([]);
  });

  it("with allowDefinitions=true and only allowlisted defs is ok", () => {
    const css = `:root { --lvis-bg: #fff; --lvis-fg: #000; }`;
    const r = validateTokenDefinitions(css, { allowDefinitions: true });
    expect(r.ok).toBe(true);
  });

  it("ignores non-lvis CSS variable definitions", () => {
    const css = `:root { --my-app-color: red; --lvis-bg: #fff; }`;
    const r = validateTokenDefinitions(css, { allowDefinitions: true });
    expect(r.ok).toBe(true);
    expect([...findLvisTokenDefinitions(css)]).toEqual(["--lvis-bg"]);
  });
});
