import { useEffect } from "react";
import { type LvisHostThemeEvent, type LvisThemeBundleId, LVIS_TOKEN_NAMES, LVIS_THEME_BUNDLE_IDS } from "../tokens/index.js";
import { applyThemeTokens } from "../tokens/inject.js";

type PluginBridge = {
  onEvent: (type: string, handler: (data: unknown) => void) => () => void;
};

const VALID_BUNDLE_IDS = new Set<LvisThemeBundleId>(LVIS_THEME_BUNDLE_IDS);
const VALID_SHELL_MODES = new Set<string>(["light", "dark"]);
// Closed allowlist mirrors LVIS_TOKEN_NAMES — same set as inject.ts:_ALLOWED_KEYS.
const _ALLOWED_TOKEN_KEYS = new Set<string>(LVIS_TOKEN_NAMES);

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
export function useTheme(bridge: PluginBridge): void {
  useEffect(() => {
    const unsub = bridge.onEvent("host.theme.changed", (data) => {
      const payload = data as Partial<LvisHostThemeEvent>;
      if (!payload) return;
      const root = document.documentElement;
      if (payload.bundleId !== undefined && VALID_BUNDLE_IDS.has(payload.bundleId as LvisThemeBundleId))
        root.setAttribute("data-theme-bundle", payload.bundleId);
      if (payload.shell !== undefined && VALID_SHELL_MODES.has(payload.shell))
        root.setAttribute("data-shell", payload.shell);
      if (payload.tokens) {
        const safe: Record<string, string> = {};
        for (const [k, v] of Object.entries(payload.tokens)) {
          if (_ALLOWED_TOKEN_KEYS.has(k) && typeof v === "string") safe[k] = v;
        }
        if (Object.keys(safe).length > 0) applyThemeTokens(safe);
      }
    });
    return unsub;
  }, [bridge]);
}
