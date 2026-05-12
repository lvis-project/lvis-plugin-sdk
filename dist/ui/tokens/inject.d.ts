import { type LvisHostThemeEvent } from "./index.js";
declare function resolveDoc(target?: Document | HTMLElement): Document | null;
export declare function ensureFallback(targetDoc?: Document): void;
export declare function injectTokenCss(id: string, css: string, targetDoc?: Document): void;
/**
 * Apply token CSS custom properties to `target`.
 *
 * - `target` defaults to `document.documentElement`. Pass a `Document` (e.g.
 *   the document of a detached `BrowserWindow`) to target that window's
 *   documentElement, or pass a specific `HTMLElement` to scope the tokens
 *   to a sub-tree (useful for sidebar mounts that don't own
 *   documentElement).
 * - Tokens not in `LVIS_TOKEN_NAMES` are silently dropped (closed allowlist).
 * - Values matching the unsafe-CSS regex (`url(`, `expression(`, HTML tag
 *   prefix) are silently dropped.
 */
export declare function applyThemeTokens(tokens: Record<string, string>, target?: Document | HTMLElement): void;
/**
 * Apply a `LvisHostThemeEvent` (or `null`) to `target`.
 *
 * Convenience helper that removes per-plugin boilerplate for the common
 * DOM-update pattern:
 * - Sets `data-theme-bundle` and `data-shell` attributes on `target` (or
 *   the resolved documentElement when a `Document` is passed), or removes
 *   them when the event is `null` (theme reset).
 * - Validates `bundleId` against {@link LVIS_THEME_BUNDLE_IDS} before
 *   writing the attribute (no stale/unknown bundle id leaks into the DOM).
 * - Validates `shell` to `"light" | "dark"` before writing.
 * - Applies all token values via {@link applyThemeTokens} (closed allowlist
 *   + unsafe-value guard are enforced there).
 *
 * Plugins that use `useTheme` or `primeTheme` directly do NOT need to call
 * this helper — those wrappers already perform the same logic internally.
 * This is intended for vanilla-JS plugins or custom React shells that
 * manage the bridge event subscription themselves.
 *
 * @param event - Parsed `LvisHostThemeEvent`, or `null` to clear theme attrs.
 * @param target - Optional target. Defaults to `document.documentElement`.
 */
export declare function applyThemeFromHostEvent(event: LvisHostThemeEvent | null, target?: Document | HTMLElement): void;
export { resolveDoc as _resolveDoc };
//# sourceMappingURL=inject.d.ts.map