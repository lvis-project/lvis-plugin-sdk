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
import { LVIS_TOKEN_NAMES } from "./index.js";

const _LVIS_VAR_REF = /var\(\s*(--lvis-[a-z0-9-]+)/gi;
const _LVIS_DEF = /(--lvis-[a-z0-9-]+)\s*:/gi;

const _ALLOWED_TOKENS = new Set<string>(LVIS_TOKEN_NAMES);

/** Extract every `--lvis-*` token referenced via `var(--lvis-*)`. */
export function findLvisTokenReferences(css: string): Set<string> {
  const out = new Set<string>();
  for (const m of css.matchAll(_LVIS_VAR_REF)) out.add(m[1].toLowerCase());
  return out;
}

/** Extract every `--lvis-*` token *defined* (left-hand side of CSS declaration). */
export function findLvisTokenDefinitions(css: string): Set<string> {
  const out = new Set<string>();
  for (const m of css.matchAll(_LVIS_DEF)) out.add(m[1].toLowerCase());
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
 * Validate that `--lvis-*` definitions in `css`:
 *   1. only use allowlisted names (no inventing new tokens), AND
 *   2. when `allowDefinitions` is `false` (default for plugin code), no
 *      `--lvis-*` declarations exist at all — the host owns canonical values
 *      and plugins must consume via `var(--lvis-*)`, not redefine.
 *
 * The SDK's own `lvis-tokens.css` is the one place where definitions ARE
 * legitimate; it should pass the validator with `allowDefinitions: true`.
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
