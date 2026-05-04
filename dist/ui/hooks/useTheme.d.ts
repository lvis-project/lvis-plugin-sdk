type PluginBridge = {
    onEvent: (type: string, handler: (data: unknown) => void) => () => void;
};
/**
 * Subscribe to host theme changes via the plugin bridge.
 *
 * When `host.theme.changed` fires with a `tokens` field, applies computed
 * `--lvis-*` values directly via style.setProperty (inline style wins over
 * any stylesheet). The `data-theme`/`data-chat-theme`/`data-code-theme`
 * attributes are set for devtools inspection only — there are no CSS selector
 * blocks in lvis-tokens.css that react to them.
 *
 * When `tokens` is absent the plugin retains its current token state;
 * initial render uses the :root fallback values in lvis-tokens.css (dark).
 *
 * Call once at the plugin's root component.
 */
export declare function useTheme(bridge: PluginBridge): void;
export {};
//# sourceMappingURL=useTheme.d.ts.map