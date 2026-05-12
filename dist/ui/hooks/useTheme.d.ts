import { type PluginBridgeForTheme, type PrimeThemeOptions } from "./primeTheme.js";
/**
 * Plugin bridge surface required by `useTheme`.
 *
 * Same shape as {@link PluginBridgeForTheme} — `onEvent` is required,
 * `getTheme` is optional (when present, enables flicker-free cold-boot
 * paint via a sync pull).
 */
export type PluginBridge = PluginBridgeForTheme;
/**
 * React wrapper around {@link primeTheme}. Subscribes to
 * `host.theme.changed` and primes the initial state on mount.
 *
 * Tokens are applied with the same closed allowlist + unsafe-value guard
 * (`LVIS_TOKEN_NAMES`, regex on `url(` / `expression(` / HTML tag prefix)
 * via `applyThemeFromHostEvent` — no plugin can inject arbitrary CSS.
 *
 * Call once at the plugin's root component. Pass `opts.target` to scope
 * tokens to a sub-tree (detached BrowserWindow document, scoped sidebar
 * root). Pass `opts.onPayload` to receive every validated payload for
 * custom token derivations (avoids the previous anti-pattern of
 * subscribing to `host.theme.changed` a second time alongside `useTheme`).
 *
 * Bridge identity is the meaningful effect dep — `opts` is intentionally
 * not in the dep array; passing a literal `{ target, onPayload }` object
 * every render does not re-fire the effect.
 *
 * @example
 * ```tsx
 * function App({ bridge, rootEl }: Props) {
 *   useTheme(bridge, {
 *     target: rootEl,                        // optional: scoped root
 *     onPayload: (e) => mapSidebarTokens(e), // optional: custom mapping
 *   });
 *   // …
 * }
 * ```
 */
export declare function useTheme(bridge: PluginBridge, opts?: PrimeThemeOptions): void;
//# sourceMappingURL=useTheme.d.ts.map