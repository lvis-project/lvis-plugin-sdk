/**
 * SDK self-test — locks the contract that the SDK's own component CSS
 * references only `--lvis-*` tokens enumerated in `LVIS_TOKEN_NAMES`.
 *
 * If a refactor introduces a typo (e.g. `var(--lvis-fg-mute)` missing the
 * trailing `d`) or a new token without updating the allowlist, this test
 * fails with a precise list of unknown names. The host's runtime allowlist
 * would silently drop the same reference and the plugin would render with
 * the CSS `initial` value — invisible regression. Catching it here keeps
 * the SDK's promise to plugin authors honest.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  validateTokenUsage,
  validateTokenDefinitions,
  findLvisTokenReferences,
} from "../tokens/validate.js";

// vitest runs with cwd = repo root; resolve relative to that so the test
// works under both `bun run test` and an editor's vitest integration.
const _UI_DIR = join(process.cwd(), "src", "ui");
const _COMPONENTS_DIR = join(_UI_DIR, "components");
const _TOKENS_CSS = join(_UI_DIR, "tokens", "lvis-tokens.css");

function listTsxFiles(dir: string): string[] {
  return readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => join(dir, f));
}

describe("SDK component CSS — token allowlist self-check", () => {
  it("every var(--lvis-*) reference in components is in LVIS_TOKEN_NAMES", () => {
    const offenders: Array<{ file: string; unknown: string[] }> = [];
    for (const file of listTsxFiles(_COMPONENTS_DIR)) {
      const css = readFileSync(file, "utf8");
      const r = validateTokenUsage(css);
      if (!r.ok) offenders.push({ file, unknown: r.unknown });
    }
    expect(offenders).toEqual([]);
  });

  it("lvis-tokens.css :root defines only allowlisted tokens (no extras)", () => {
    const css = readFileSync(_TOKENS_CSS, "utf8");
    const r = validateTokenDefinitions(css, { allowDefinitions: true });
    expect(r.ok).toBe(true);
    expect(r.unknown).toEqual([]);
  });

  it("component CSS does NOT redefine any --lvis-* token (host owns canonical values)", () => {
    const offenders: Array<{ file: string; redefined: string[] }> = [];
    for (const file of listTsxFiles(_COMPONENTS_DIR)) {
      const css = readFileSync(file, "utf8");
      const r = validateTokenDefinitions(css);
      if (!r.ok) offenders.push({ file, redefined: r.forbiddenRedefinitions });
    }
    expect(offenders).toEqual([]);
  });

  it("every allowlisted token is actually used by at least one component (catches stale entries)", () => {
    const used = new Set<string>();
    for (const file of listTsxFiles(_COMPONENTS_DIR)) {
      for (const tok of findLvisTokenReferences(readFileSync(file, "utf8"))) used.add(tok);
    }
    // Tokens declared in tokens.css but never consumed by any SDK component
    // are candidates for removal; surfacing them here lets us choose between
    // adding a new component that uses them or deleting the entry.
    const tokensCss = readFileSync(_TOKENS_CSS, "utf8");
    const declared = new Set<string>();
    for (const m of tokensCss.matchAll(/(--lvis-[a-z0-9-]+)\s*:/gi)) declared.add(m[1].toLowerCase());
    const stale = [...declared].filter((t) => !used.has(t)).sort();
    expect(stale).toEqual([]);
  });
});
