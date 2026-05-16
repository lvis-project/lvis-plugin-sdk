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

// ---------------------------------------------------------------------------
// Plugin-local CSS namespace validator
// ---------------------------------------------------------------------------

/**
 * Pattern for a correctly-namespaced plugin-local CSS custom property:
 * `--<2-3 lowercase letters>-<rest>` where the prefix is NOT `lvis`
 * (those belong to the host allowlist and are validated separately).
 *
 * Valid:   `--pm-accent-bg`, `--li-success-bg`, `--ah-danger`
 * Invalid: `--accent-bg` (no prefix), `--my_var` (underscore not `-`),
 *          `--x-color` (single-char prefix too short), `--Pm-bg` (uppercase)
 */
const _PLUGIN_NS_PREFIX = /^--([a-z]{2,3})-[a-z]/;

/**
 * Matches any CSS custom property definition that does NOT start with `--lvis-`.
 * We anchor on declaration-start context identical to `_LVIS_DEF` above.
 */
const _LOCAL_VAR_DEF = /(?:^|[{};])\s*(--(?!lvis-)[a-z][a-z0-9-]*)\s*:/gi;

/**
 * Vendor-prefixed CSS custom properties from popular libraries that plugins
 * commonly pull in via Tailwind, Radix UI, Shiki, Reach UI, etc.
 * These are exempt from plugin namespace enforcement.
 */
const DEFAULT_VENDOR_ALLOWLIST: readonly string[] = [
  "tw",
  "radix",
  "shiki",
  "reach",
  "vis",
  "react",
];

/**
 * Known plugin namespace prefixes. Callers may extend this list via `validPrefixes`.
 * When `validPrefixes` is provided the var must use one of those prefixes;
 * when omitted, any valid 2-3 lowercase-letter prefix is accepted.
 */
const DEFAULT_VALID_PREFIXES: readonly string[] = [
  "pm", "li", "ah", "wa", "wp", "mg", "ai",
];

export type PluginNamespaceReport = {
  ok: boolean;
  /**
   * Plugin-local CSS vars whose names lack a valid 2-3 character prefix
   * (hard failures — present when `mode` is `"error"` or `"warn"`).
   */
  violations: string[];
  /**
   * Same as `violations` but surfaced as soft warnings when `mode` is `"warn"`.
   * In `"error"` mode this array is always empty (everything goes to `violations`).
   */
  warnings: string[];
};

export interface PluginNamespaceOptions {
  /**
   * Vars to skip entirely (known-good exceptions, e.g. intentional layout tokens
   * without a plugin prefix).
   */
  ignoreVars?: ReadonlySet<string>;
  /**
   * Vendor library prefixes whose vars are exempt from namespace enforcement.
   * Defaults to `["tw", "radix", "shiki", "reach", "vis", "react"]`.
   * Pass an explicit array to replace (not extend) the default list.
   */
  vendorAllowlist?: readonly string[];
  /**
   * When set, vars must use one of the listed prefixes (e.g. `["pm", "li"]`).
   * When omitted, any valid 2-3 lowercase-letter prefix is accepted.
   * Defaults to `["pm", "li", "ah", "wa", "wp", "mg", "ai"]`.
   */
  validPrefixes?: readonly string[];
  /**
   * `"error"` (default) — violations go to `violations[]` and `ok` is false.
   * `"warn"`  — violations go to `warnings[]` instead; `ok` remains true so
   *              CI scripts can choose whether to fail-on-warn via env var.
   */
  mode?: "error" | "warn";
}

/**
 * Validate that every plugin-local CSS var definition (anything that is NOT
 * `--lvis-*` and NOT a vendor-library var) carries a 2-3 lowercase-letter
 * namespace prefix followed by a lowercase letter.
 *
 * Options:
 * - `ignoreVars`      — skip specific var names
 * - `vendorAllowlist` — skip vars with any of these prefixes (default: tw/radix/shiki/reach/vis/react)
 * - `validPrefixes`   — restrict to an explicit prefix set (default: pm/li/ah/wa/wp/mg/ai)
 * - `mode`            — `"error"` (default) puts findings in `violations`; `"warn"` puts them in `warnings`
 */
export function validatePluginCssNamespace(
  css: string,
  options: PluginNamespaceOptions = {},
): PluginNamespaceReport {
  const {
    ignoreVars,
    vendorAllowlist = DEFAULT_VENDOR_ALLOWLIST,
    validPrefixes = DEFAULT_VALID_PREFIXES,
    mode = "error",
  } = options;

  const stripped = stripCommentsAndStrings(css);
  const seen = new Set<string>();
  const findings: string[] = [];

  for (const m of stripped.matchAll(_LOCAL_VAR_DEF)) {
    const name = m[1];
    if (seen.has(name)) continue;
    seen.add(name);
    if (ignoreVars?.has(name)) continue;

    // Extract the prefix segment (first hyphen-delimited token after `--`).
    // _LOCAL_VAR_DEF already ensures the first char after `--` is [a-z],
    // so we only need to find the next `-`.
    const prefixMatch = name.match(/^--([a-z][a-z0-9]*)-/);
    const prefix = prefixMatch?.[1] ?? "";

    // Skip vendor-library vars (e.g. --tw-*, --radix-*, --shiki-*).
    if (vendorAllowlist.includes(prefix)) continue;

    // Must pass the structural namespace pattern (2-3 lower chars + `-` + lower char).
    if (!_PLUGIN_NS_PREFIX.test(name)) {
      findings.push(name);
      continue;
    }

    // When a validPrefixes list is provided, the prefix must be in it.
    if (validPrefixes.length > 0 && !validPrefixes.includes(prefix)) {
      findings.push(name);
    }
  }

  findings.sort();
  if (mode === "warn") {
    return { ok: true, violations: [], warnings: findings };
  }
  return { ok: findings.length === 0, violations: findings, warnings: [] };
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
 *   and plugins must consume via `var(--lvis-*)`, not redefine.
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
