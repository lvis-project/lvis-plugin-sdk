/**
 * Build-time validator for `--lvis-*` CSS-token usage.
 *
 * Plugins (and the SDK itself) MUST only reference tokens enumerated in
 * `LVIS_TOKEN_NAMES`. The host validates the same allowlist at theme-broadcast
 * time, so any token outside it would silently disappear at runtime — a
 * `var(--lvis-typo)` reference would render as the CSS `initial` keyword
 * with no visual feedback. This validator catches the mistake at the build
 * step instead of letting it ship as an invisible regression.
 *
 * The validator is a pure string-scan with no CSS-AST dependency, so it can
 * run in a vitest unit test, a CI script, or a plugin's own pre-publish hook
 * without pulling postcss into the build.
 */
import { LVIS_TOKEN_NAMES, type LvisTokenName } from "./index.js";

// Match `--lvis-*` references and definitions case-insensitively at the
// REGEX level so a typo like `var(--LVIS-bg)` is also captured — but the
// captured text preserves its original casing. The allowlist check is then
// case-sensitive (CSS custom properties are case-sensitive per the CSS
// Variables spec — `--Lvis-bg` ≠ `--lvis-bg`), so `--LVIS-bg` is flagged
// as unknown. Without `i` we'd miss the typo entirely.
const _LVIS_VAR_REF = /var\(\s*(--lvis-[a-z0-9-]+)/gi;
// Anchor on a declaration-start context (start, `{`, `;`, or `}`) so we
// don't false-match inside attribute selectors like
// `[data-x="--lvis-bg"]:hover`. Linear-time — no nested quantifier.
const _LVIS_DEF = /(?:^|[{};])\s*(--lvis-[a-z0-9-]+)\s*:/gi;
// Strip CSS block comments and string literals before scanning so a
// commented-out `var(--lvis-typo)` or a string with an --lvis-* substring
// doesn't surface as a false positive.
const _CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const _CSS_STRING = /(["'])(?:\\.|(?!\1).)*\1/g;

const _ALLOWED_TOKENS: ReadonlySet<LvisTokenName> = new Set(LVIS_TOKEN_NAMES);

function stripCommentsAndStrings(css: string): string {
  return css.replace(_CSS_COMMENT, "").replace(_CSS_STRING, "");
}

/** Extract every `--lvis-*` token referenced via `var(--lvis-*)`. */
export function findLvisTokenReferences(css: string): Set<string> {
  const out = new Set<string>();
  for (const m of stripCommentsAndStrings(css).matchAll(_LVIS_VAR_REF)) out.add(m[1]);
  return out;
}

/** Extract every `--lvis-*` token *defined* (left-hand side of CSS declaration). */
export function findLvisTokenDefinitions(css: string): Set<string> {
  const out = new Set<string>();
  for (const m of stripCommentsAndStrings(css).matchAll(_LVIS_DEF)) out.add(m[1]);
  return out;
}

export type TokenUsageReport = {
  ok: boolean;
  /** `--lvis-*` references not in the allowlist (typos or stale names). */
  unknown: string[];
};

/**
 * Validate that every `--lvis-*` reference in `css` belongs to the allowlist
 * (defaults to `LVIS_TOKEN_NAMES`). Pass a custom `allowlist` only in tests.
 */
export function validateTokenUsage(
  css: string,
  allowlist: ReadonlySet<string> = _ALLOWED_TOKENS,
): TokenUsageReport {
  const refs = findLvisTokenReferences(css);
  const unknown: string[] = [];
  for (const r of refs) if (!allowlist.has(r)) unknown.push(r);
  return { ok: unknown.length === 0, unknown: unknown.sort() };
}

export type TokenDefinitionReport = {
  ok: boolean;
  /** `--lvis-*` definitions whose name is not in the allowlist. */
  unknown: string[];
  /** Allowed names that were redefined where redefinition is forbidden. */
  forbiddenRedefinitions: string[];
};

/**
 * Validate `--lvis-*` definitions in `css`:
 *
 * - Names outside the allowlist always go to `unknown` (mistyped or invented).
 * - Allowlisted names go to `forbiddenRedefinitions` UNLESS
 *   `allowDefinitions: true` is passed — the host owns canonical token values
 *   and plugins must consume via `var(--lvis-*)`, not redefine. The SDK's
 *   own `lvis-tokens.css` is the one place where definitions are legitimate.
 */
export function validateTokenDefinitions(
  css: string,
  options: { allowDefinitions?: boolean; allowlist?: ReadonlySet<string> } = {},
): TokenDefinitionReport {
  const { allowDefinitions = false, allowlist = _ALLOWED_TOKENS } = options;
  const defs = findLvisTokenDefinitions(css);
  const unknown: string[] = [];
  const forbiddenRedefinitions: string[] = [];
  for (const d of defs) {
    if (!allowlist.has(d)) unknown.push(d);
    else if (!allowDefinitions) forbiddenRedefinitions.push(d);
  }
  return {
    ok: unknown.length === 0 && forbiddenRedefinitions.length === 0,
    unknown: unknown.sort(),
    forbiddenRedefinitions: forbiddenRedefinitions.sort(),
  };
}
