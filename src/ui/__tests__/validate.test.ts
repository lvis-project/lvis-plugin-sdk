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
