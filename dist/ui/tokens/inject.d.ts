import { type LvisHostThemeEvent } from "./index.js";
export declare function ensureFallback(): void;
export declare function injectTokenCss(id: string, css: string): void;
export declare function applyThemeTokens(tokens: Record<string, string>): void;
/**
 * Apply a `LvisHostThemeEvent` (or `null`) to the document root.
 *
 * Convenience helper that removes per-plugin boilerplate for the common
 * DOM-update pattern:
 * - Sets `data-theme-bundle` and `data-shell` attributes, or removes them
 *   when the event is `null` (theme reset).
 * - Validates `bundleId` against {@link LVIS_THEME_BUNDLE_IDS} before
 *   writing the attribute (no stale/unknown bundle id leaks into the DOM).
 * - Validates `shell` to `"light" | "dark"` before writing.
 * - Applies all token values via {@link applyThemeTokens} (closed allowlist
 *   + unsafe-value guard are enforced there).
 *
 * Plugins that use `useTheme` directly do NOT need to call this helper —
 * the hook already performs the same logic internally. This is intended for
 * vanilla-JS plugins or custom React shells that manage the bridge event
 * subscription themselves.
 *
 * @param event - Parsed `LvisHostThemeEvent`, or `null` to clear theme attrs.
 */
export declare function applyThemeFromHostEvent(event: LvisHostThemeEvent | null): void;
//# sourceMappingURL=inject.d.ts.map