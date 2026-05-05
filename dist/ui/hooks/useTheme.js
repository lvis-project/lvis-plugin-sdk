// src/ui/hooks/useTheme.ts
import { useEffect } from "react";

// src/ui/tokens/index.ts
var LVIS_TOKEN_NAMES = [
  "--lvis-bg",
  "--lvis-surface",
  "--lvis-surface-overlay",
  "--lvis-fg",
  "--lvis-fg-muted",
  "--lvis-fg-disabled",
  "--lvis-primary",
  "--lvis-primary-fg",
  "--lvis-secondary",
  "--lvis-secondary-fg",
  "--lvis-danger",
  "--lvis-danger-fg",
  "--lvis-warning",
  "--lvis-warning-fg",
  "--lvis-success",
  "--lvis-success-fg",
  "--lvis-border",
  "--lvis-ring",
  "--lvis-radius-xs",
  "--lvis-radius-sm",
  "--lvis-radius",
  "--lvis-radius-lg",
  "--lvis-radius-full",
  "--lvis-text-xs",
  "--lvis-text-sm",
  "--lvis-text-base",
  "--lvis-text-lg",
  "--lvis-weight-normal",
  "--lvis-weight-medium",
  "--lvis-weight-semibold",
  "--lvis-space-1",
  "--lvis-space-2",
  "--lvis-space-3",
  "--lvis-space-4",
  "--lvis-motion-fast",
  "--lvis-motion-normal"
];

// src/ui/tokens/inject.ts
var _ALLOWED_KEYS = new Set(LVIS_TOKEN_NAMES);
var _UNSAFE_VALUE = /url\s*\(|expression\s*\(|<[a-zA-Z]/i;
function applyThemeTokens(tokens) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) {
    if (!_ALLOWED_KEYS.has(k)) continue;
    if (_UNSAFE_VALUE.test(v)) continue;
    root.style.setProperty(k, v);
  }
}

// src/ui/hooks/useTheme.ts
var VALID_THEMES = /* @__PURE__ */ new Set(["light", "dark", "high-contrast"]);
var VALID_CHAT_THEMES = /* @__PURE__ */ new Set(["lg", "purple", "orange", "blue"]);
var VALID_CODE_THEMES = /* @__PURE__ */ new Set(["light", "dark"]);
var _ALLOWED_TOKEN_KEYS = new Set(LVIS_TOKEN_NAMES);
function useTheme(bridge) {
  useEffect(() => {
    const unsub = bridge.onEvent("host.theme.changed", (data) => {
      const payload = data;
      if (!payload) return;
      const root = document.documentElement;
      if (payload.theme !== void 0 && VALID_THEMES.has(payload.theme))
        root.setAttribute("data-theme", payload.theme);
      if (payload.codeTheme !== void 0 && VALID_CODE_THEMES.has(payload.codeTheme))
        root.setAttribute("data-code-theme", payload.codeTheme);
      if (payload.chatTheme !== void 0) {
        if (payload.chatTheme === "default") {
          root.removeAttribute("data-chat-theme");
        } else if (VALID_CHAT_THEMES.has(payload.chatTheme)) {
          root.setAttribute("data-chat-theme", payload.chatTheme);
        }
      }
      if (payload.tokens) {
        const safe = {};
        for (const [k, v] of Object.entries(payload.tokens)) {
          if (_ALLOWED_TOKEN_KEYS.has(k) && typeof v === "string") safe[k] = v;
        }
        if (Object.keys(safe).length > 0) applyThemeTokens(safe);
      }
      if (payload.colorScheme !== void 0) {
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
export {
  useTheme
};
