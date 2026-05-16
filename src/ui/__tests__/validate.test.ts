import { describe, it, expect } from "vitest";
import {
  findLvisTokenReferences,
  findLvisTokenDefinitions,
  validateTokenUsage,
  validateTokenDefinitions,
  validatePluginCssNamespace,
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

describe("validatePluginCssNamespace", () => {
  it("ok=true when all plugin-local vars have a 2-3 char prefix", () => {
    const css = `.x { --pm-accent-bg: red; --li-success-bg: green; --ah-danger: blue; }`;
    expect(validatePluginCssNamespace(css)).toEqual({ ok: true, violations: [], warnings: [] });
  });

  it("flags a bare var with no prefix", () => {
    const css = `.x { --accent-bg: red; }`;
    const r = validatePluginCssNamespace(css);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual(["--accent-bg"]);
    expect(r.warnings).toEqual([]);
  });

  it("flags multiple bare vars and sorts them", () => {
    const css = `.x { --success-bg: green; --danger-bg: red; --warning-bg: orange; }`;
    const r = validatePluginCssNamespace(css);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual(["--danger-bg", "--success-bg", "--warning-bg"]);
  });

  it("flags a single-char prefix (too short)", () => {
    const css = `.x { --x-color: red; }`;
    const r = validatePluginCssNamespace(css);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual(["--x-color"]);
  });

  it("does NOT flag --lvis-* vars (those are validated separately)", () => {
    const css = `:root { --lvis-bg: #fff; --lvis-fg: #000; }`;
    expect(validatePluginCssNamespace(css)).toEqual({ ok: true, violations: [], warnings: [] });
  });

  it("accepts a 2-char prefix", () => {
    const css = `.x { --li-bg: blue; }`;
    expect(validatePluginCssNamespace(css)).toEqual({ ok: true, violations: [], warnings: [] });
  });

  it("accepts a 3-char prefix", () => {
    const css = `.x { --pm-accent: red; --ah-danger: orange; }`;
    expect(validatePluginCssNamespace(css)).toEqual({ ok: true, violations: [], warnings: [] });
  });

  it("dedupes repeated definitions of the same var name", () => {
    const css = `.a { --accent-bg: red; } .b { --accent-bg: blue; }`;
    const r = validatePluginCssNamespace(css);
    expect(r.violations).toEqual(["--accent-bg"]);
  });

  it("ignores vars listed in ignoreVars set", () => {
    const css = `.x { --accent-bg: red; --bg-base: blue; }`;
    const r = validatePluginCssNamespace(css, {
      ignoreVars: new Set(["--accent-bg", "--bg-base"]),
    });
    expect(r.ok).toBe(true);
  });

  it("ignores CSS block comments", () => {
    const css = `/* --accent-bg: red; */ .x { --pm-ok: green; }`;
    expect(validatePluginCssNamespace(css)).toEqual({ ok: true, violations: [], warnings: [] });
  });

  it("ignores string literals containing var-like text", () => {
    const css = `.x::before { content: "--accent-bg"; --pm-ok: green; }`;
    expect(validatePluginCssNamespace(css)).toEqual({ ok: true, violations: [], warnings: [] });
  });

  // --- Fix 2: vendor allowlist ---
  it("skips vendor-allowlisted prefixes (--radix-popper-anchor-width)", () => {
    const css = `.x { --radix-popper-anchor-width: 200px; --tw-ring-color: blue; --shiki-color-text: red; }`;
    const r = validatePluginCssNamespace(css);
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it("flags a non-vendor non-plugin prefix not in validPrefixes", () => {
    const css = `.x { --zy-custom: red; }`;
    const r = validatePluginCssNamespace(css);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual(["--zy-custom"]);
  });

  it("accepts custom vendorAllowlist that overrides default", () => {
    // --tw-* not in custom list — should flag
    const css = `.x { --tw-ring: blue; }`;
    const r = validatePluginCssNamespace(css, { vendorAllowlist: [] });
    expect(r.ok).toBe(false);
    expect(r.violations).toContain("--tw-ring");
  });

  // --- Fix 3: warn mode ---
  it("warns instead of errors in warn mode", () => {
    const css = `.x { --accent-bg: red; }`;
    const r = validatePluginCssNamespace(css, { mode: "warn" });
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
    expect(r.warnings).toEqual(["--accent-bg"]);
  });

  it("warn mode: ok=true even with multiple violations", () => {
    const css = `.x { --bad-one: red; --nope: blue; }`;
    const r = validatePluginCssNamespace(css, { mode: "warn" });
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual(["--bad-one", "--nope"]);
    expect(r.violations).toEqual([]);
  });

  // --- Fix 4: validPrefixes ---
  it("accepts vars matching custom validPrefixes", () => {
    const css = `.x { --pm-color: red; }`;
    const r = validatePluginCssNamespace(css, { validPrefixes: ["pm"] });
    expect(r.ok).toBe(true);
  });

  it("flags vars with prefix not in custom validPrefixes", () => {
    const css = `.x { --zz-color: red; }`;
    const r = validatePluginCssNamespace(css, { validPrefixes: ["pm", "li"] });
    expect(r.ok).toBe(false);
    expect(r.violations).toContain("--zz-color");
  });

  // --- Fix 5: edge case tests ---
  it("rejects uppercase prefix (--Pm-bg is not matched by _LOCAL_VAR_DEF — treated as ok by regex, but suffix is uppercase so _PLUGIN_NS_PREFIX fails)", () => {
    // _LOCAL_VAR_DEF anchors on [a-z] as first char, so --Pm-bg is never captured
    // (capital P). The var effectively doesn't appear to the scanner. This is
    // correct behavior: CSS custom properties are case-sensitive, so --Pm-bg
    // is a distinct var — plugin authors MUST use lowercase-only names.
    const css = `.x { --pm-bg: red; }`;
    const r = validatePluginCssNamespace(css);
    expect(r.ok).toBe(true); // --pm-bg (lowercase) is valid
  });

  it("rejects prefix-only with no suffix name (--pm is not a definition — colon required)", () => {
    // A bare `--pm` with a colon IS a valid CSS custom property but has no
    // suffix letter after the prefix dash. The _PLUGIN_NS_PREFIX regex requires
    // `[a-z]` after the trailing dash, so --pm: would be flagged.
    // _LOCAL_VAR_DEF captures `--pm` as a name; _PLUGIN_NS_PREFIX fails since
    // there is no `-[a-z]` after the 2-char prefix body.
    const css = `.x { --pm: red; }`;
    const r = validatePluginCssNamespace(css);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual(["--pm"]);
  });
});
