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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateTokenUsage,
  validateTokenDefinitions,
  findLvisTokenReferences,
  findLvisTokenDefinitions,
} from "../tokens/validate.js";

// Anchor on this test file's location, not `process.cwd()` — keeps the test
// working under VSCode's vitest extension, monorepo runs, and the case
// where this file lands inside a downstream plugin's `node_modules` (the
// existsSync guard below no-ops then; this is an SDK-internal check).
const _HERE = dirname(fileURLToPath(import.meta.url));
const _UI_DIR = join(_HERE, "..");
const _COMPONENTS_DIR = join(_UI_DIR, "components");
const _TOKENS_CSS = join(_UI_DIR, "tokens", "lvis-tokens.css");
const _STYLE_EXTS = /\.(tsx|css)$/;

function listStyleSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  // Recursive: catches nested component directories if the SDK ever splits
  // `components/forms/Field.tsx` etc., plus standalone `.css` modules.
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && _STYLE_EXTS.test(e.name))
    .map((e) => join(e.parentPath ?? dir, e.name));
}

// When this test file lands inside a downstream plugin's `node_modules`
// (e.g. an IDE picking it up via default vitest discovery), the SDK source
// dirs don't exist — skip rather than fail-noisy on someone else's project.
const _SDK_SRC_PRESENT = existsSync(_COMPONENTS_DIR) && existsSync(_TOKENS_CSS);

describe.skipIf(!_SDK_SRC_PRESENT)("SDK component CSS — token allowlist self-check", () => {
  it("every var(--lvis-*) reference in components is in LVIS_TOKEN_NAMES", () => {
    const offenders: Array<{ file: string; unknown: string[] }> = [];
    for (const file of listStyleSourceFiles(_COMPONENTS_DIR)) {
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
    for (const file of listStyleSourceFiles(_COMPONENTS_DIR)) {
      const css = readFileSync(file, "utf8");
      const r = validateTokenDefinitions(css);
      if (!r.ok) offenders.push({ file, redefined: r.forbiddenRedefinitions });
    }
    expect(offenders).toEqual([]);
  });

  it("every allowlisted token is actually used by at least one component (warn on stale)", () => {
    const used = new Set<string>();
    for (const file of listStyleSourceFiles(_COMPONENTS_DIR)) {
      for (const tok of findLvisTokenReferences(readFileSync(file, "utf8"))) used.add(tok);
    }
    // Tokens declared in tokens.css but never consumed by any SDK component
    // are candidates for removal. Warn rather than fail — a new token landed
    // before its first consumer is a legitimate sequencing pattern; the warn
    // surfaces the gap without blocking the merge that introduces the token.
    const declared = findLvisTokenDefinitions(readFileSync(_TOKENS_CSS, "utf8"));
    const stale = [...declared].filter((t) => !used.has(t)).sort();
    if (stale.length > 0) {
      console.warn(`[sdk-self-token-allowlist] declared but unused: ${stale.join(", ")}`);
    }
  });
});
