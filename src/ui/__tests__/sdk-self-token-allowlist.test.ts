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
import { LVIS_TOKEN_NAMES, LVIS_CSS_ONLY_TOKEN_NAMES } from "../tokens/index.js";

// Combined allowlist for lvis-tokens.css: IPC tokens + CSS-only static tokens.
// CSS-only tokens (shadow, easing) cannot be sent over IPC but are valid
// definitions in the SDK's offline fallback CSS.
const _CSS_FULL_ALLOWLIST = new Set<string>([...LVIS_TOKEN_NAMES, ...LVIS_CSS_ONLY_TOKEN_NAMES]);

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

  it("no component hides token references inside JSX/JS string literals (validator-bypass guard)", () => {
    // Regression for Copilot review on PR #94: a `var(--lvis-*)` placed
    // inside a JSX attribute string (e.g. `stroke="var(--lvis-primary)"`)
    // gets erased by `stripCommentsAndStrings` before the allowlist regex
    // runs, silently bypassing this self-test. Compare a raw scan against
    // the validator's stripped scan — if the raw count is higher than the
    // stripped count for any file, the difference is references hiding
    // inside quoted strings, which means the validator can't see them.
    // Fix is to move them into template-literal CSS blocks (backticks are
    // not stripped).
    const _RAW_VAR_REF = /var\(\s*(--lvis-[a-z0-9-]+)/gi;
    const offenders: Array<{ file: string; hidden: string[] }> = [];
    for (const file of listStyleSourceFiles(_COMPONENTS_DIR)) {
      const css = readFileSync(file, "utf8");
      const raw = new Set<string>();
      for (const m of css.matchAll(_RAW_VAR_REF)) raw.add(m[1]);
      const visible = findLvisTokenReferences(css);
      const hidden = [...raw].filter((t) => !visible.has(t)).sort();
      if (hidden.length > 0) offenders.push({ file, hidden });
    }
    expect(offenders).toEqual([]);
  });

  it("lvis-tokens.css :root defines only allowlisted tokens (no extras)", () => {
    const css = readFileSync(_TOKENS_CSS, "utf8");
    // Use the combined allowlist: IPC tokens (LVIS_TOKEN_NAMES) + CSS-only
    // static tokens (LVIS_CSS_ONLY_TOKEN_NAMES). The latter are valid fallback
    // definitions in lvis-tokens.css but are never sent over IPC.
    const r = validateTokenDefinitions(css, { allowDefinitions: true, allowlist: _CSS_FULL_ALLOWLIST });
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
      // GitHub Actions parses `::warning::` and renders it on the PR review
      // panel — a plain console.warn would stay buried in collapsed step
      // output and a stale entry could linger forever.
      const msg = `declared in lvis-tokens.css but unused by any component: ${stale.join(", ")}`;
      console.warn(`::warning title=sdk-self-token-allowlist::${msg}`);
    }
  });
});
