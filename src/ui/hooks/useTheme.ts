import { useEffect } from "react";
import { type LvisThemePayload, LVIS_TOKEN_NAMES } from "../tokens/index.js";
import { applyThemeTokens } from "../tokens/inject.js";

type PluginBridge = {
  onEvent: (type: string, handler: (data: unknown) => void) => () => void;
};

const VALID_THEMES = new Set<string>(["light", "dark", "high-contrast"]);
const VALID_CHAT_THEMES = new Set<string>(["lg", "purple", "orange", "blue"]);
const VALID_CODE_THEMES = new Set<string>(["light", "dark"]);
// Closed allowlist mirrors LVIS_TOKEN_NAMES — same set as inject.ts:_ALLOWED_KEYS.
const _ALLOWED_TOKEN_KEYS = new Set<string>(LVIS_TOKEN_NAMES);

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
          if (_ALLOWED_TOKEN_KEYS.has(k) && typeof v === "string") safe[k] = v;
        }
        if (Object.keys(safe).length > 0) applyThemeTokens(safe);
      }
      if (payload.colorScheme !== undefined) {
        root.setAttribute("data-color-scheme", payload.colorScheme);
      }
      if (typeof payload.reducedMotion === "boolean") {
        root.setAttribute("data-reduced-motion", String(payload.reducedMotion));
      }
      if (payload.fonts?.family) {
        document.body.style.fontFamily = payload.fonts.family;
      }
    });
    return unsub;
  }, [bridge]);
}
