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
export declare function validateTokenDefinitions(css: string, options?: {
    allowDefinitions?: boolean;
    allowlist?: ReadonlySet<string>;
}): TokenDefinitionReport;
//# sourceMappingURL=validate.d.ts.map