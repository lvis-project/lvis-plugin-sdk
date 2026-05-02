import { useEffect } from "react";
import type { LvisThemePayload } from "../tokens/index.js";
import { applyThemeTokens } from "../tokens/inject.js";

type PluginBridge = {
  onEvent: (type: string, handler: (data: unknown) => void) => () => void;
};

/**
 * Subscribe to host theme changes and apply --lvis-* tokens to :root.
 * Call once at the plugin's root component.
 */
export function useTheme(bridge: PluginBridge): void {
  useEffect(() => {
    const unsub = bridge.onEvent("host.theme.changed", (data) => {
      const payload = data as LvisThemePayload;
      if (payload?.tokens) applyThemeTokens(payload.tokens);
    });
    return unsub;
  }, [bridge]);
}
