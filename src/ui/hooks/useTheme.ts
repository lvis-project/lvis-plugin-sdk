import { useEffect } from "react";
import type { LvisThemePayload } from "../tokens/index.js";
import { applyThemeTokens } from "../tokens/inject.js";

type PluginBridge = {
  onEvent: (type: string, handler: (data: unknown) => void) => () => void;
};

/**
 * Subscribe to host theme changes. Sets data-theme / data-chat-theme /
 * data-code-theme on <html> so lvis-tokens.css selectors activate, then
 * applies any explicit --lvis-* token overrides when provided.
 * Call once at the plugin's root component.
 */
export function useTheme(bridge: PluginBridge): void {
  useEffect(() => {
    const unsub = bridge.onEvent("host.theme.changed", (data) => {
      const payload = data as Partial<LvisThemePayload>;
      if (!payload) return;
      const root = document.documentElement;
      if (payload.theme !== undefined) root.setAttribute("data-theme", payload.theme);
      if (payload.codeTheme !== undefined) root.setAttribute("data-code-theme", payload.codeTheme);
      // "default" removes the accent attribute so the base :root tokens win.
      if (payload.chatTheme !== undefined) {
        if (payload.chatTheme === "default") {
          root.removeAttribute("data-chat-theme");
        } else {
          root.setAttribute("data-chat-theme", payload.chatTheme);
        }
      }
      if (payload.tokens) {
        const safe: Record<string, string> = {};
        for (const [k, v] of Object.entries(payload.tokens)) {
          if (k.startsWith("--lvis-") && typeof v === "string") safe[k] = v;
        }
        if (Object.keys(safe).length > 0) applyThemeTokens(safe);
      }
    });
    return unsub;
  }, [bridge]);
}
