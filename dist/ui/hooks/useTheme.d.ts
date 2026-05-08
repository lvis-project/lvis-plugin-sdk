type PluginBridge = {
    onEvent: (type: string, handler: (data: unknown) => void) => () => void;
};
/**
 * Subscribe to host theme changes via the plugin bridge.
 *
 * When `host.theme.changed` fires, applies the v2 event fields:
 * - `data-theme-bundle` attribute set to `bundleId` for devtools inspection.
 * - `data-shell` attribute set to `shell` mode.
 * - `--lvis-*` CSS custom properties applied via `style.setProperty`.
 *
 * Only tokens present in `LVIS_TOKEN_NAMES` are accepted; all others are
 * silently dropped (security: no CSS exfil / injection surface).
 *
 * Call once at the plugin's root component.
 */
export declare function useTheme(bridge: PluginBridge): void;
export {};
//# sourceMappingURL=useTheme.d.ts.map