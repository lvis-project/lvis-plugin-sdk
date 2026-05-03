import { useEffect } from "react";
import type { LvisThemePayload } from "../tokens/index.js";
import { applyThemeTokens } from "../tokens/inject.js";

type PluginBridge = {
  onEvent: (type: string, handler: (data: unknown) => void) => () => void;
};

const VALID_THEMES = new Set<string>(["light", "dark", "high-contrast"]);
const VALID_CHAT_THEMES = new Set<string>(["lg", "purple", "orange", "blue"]);
const VALID_CODE_THEMES = new Set<string>(["light", "dark"]);

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
      if (payload.theme !== undefined && VALID_THEMES.has(payload.theme))
        root.setAttribute("data-theme", payload.theme);
      if (payload.codeTheme !== undefined && VALID_CODE_THEMES.has(payload.codeTheme))
        root.setAttribute("data-code-theme", payload.codeTheme);
      if (payload.chatTheme !== undefined) {
        if (payload.chatTheme === "default") {
          root.removeAttribute("data-chat-theme");
        } else if (VALID_CHAT_THEMES.has(payload.chatTheme)) {
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
