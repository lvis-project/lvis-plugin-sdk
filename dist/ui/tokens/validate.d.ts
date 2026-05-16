/** Extract every `--lvis-*` token referenced via `var(--lvis-*)`. */
export declare function findLvisTokenReferences(css: string): Set<string>;
/** Extract every `--lvis-*` token *defined* (left-hand side of CSS declaration). */
export declare function findLvisTokenDefinitions(css: string): Set<string>;
export type TokenUsageReport = {
    ok: boolean;
    /** `--lvis-*` references not in the allowlist (typos or stale names). */
    unknown: string[];
};
/**
 * Validate that every `--lvis-*` reference in `css` belongs to the allowlist
 * (defaults to `LVIS_TOKEN_NAMES`). Pass a custom `allowlist` only in tests.
 */
export declare function validateTokenUsage(css: string, allowlist?: ReadonlySet<string>): TokenUsageReport;
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
export declare function validatePluginCssNamespace(css: string, options?: PluginNamespaceOptions): PluginNamespaceReport;
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
export declare function validateTokenDefinitions(css: string, options?: {
    allowDefinitions?: boolean;
    allowlist?: ReadonlySet<string>;
}): TokenDefinitionReport;
//# sourceMappingURL=validate.d.ts.map