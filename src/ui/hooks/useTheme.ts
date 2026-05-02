import { useEffect } from "react";

type PluginBridge = {
  onEvent: (type: string, handler: (data: unknown) => void) => () => void;
};

interface ThemePayload {
  theme?: string;
  chatTheme?: string;
  codeTheme?: string;
  /** Optional explicit token overrides from host. When absent, CSS selectors handle it. */
  tokens?: Record<string, string>;
}

/**
 * Subscribe to host theme changes. Sets data-theme / data-chat-theme /
 * data-code-theme on <html> so lvis-tokens.css selectors activate, then
 * applies any explicit token overrides when provided.
 * Call once at the plugin's root component.
 */
export function useTheme(bridge: PluginBridge): void {
  useEffect(() => {
    const unsub = bridge.onEvent("host.theme.changed", (data) => {
      const payload = data as ThemePayload;
      if (!payload) return;
      const root = document.documentElement;
      if (payload.theme) root.setAttribute("data-theme", payload.theme);
      if (payload.chatTheme) root.setAttribute("data-chat-theme", payload.chatTheme);
      if (payload.codeTheme) root.setAttribute("data-code-theme", payload.codeTheme);
      if (payload.tokens) {
        for (const [k, v] of Object.entries(payload.tokens)) {
          root.style.setProperty(k, v);
        }
      }
    });
    return unsub;
  }, [bridge]);
}
