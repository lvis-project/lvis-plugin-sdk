// src/ui/tokens/theme-bundles.ts
var BUNDLE_IDS = [
  "tokyo-night",
  "midnight",
  "forest",
  "lge-light",
  "lge-dark",
  "high-contrast",
  "catppuccin-mocha",
  "catppuccin-latte",
  "nord",
  "gruvbox-dark-hard",
  "solarized-light",
  "rose-pine",
  "cherry-blossom"
];

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
var LVIS_THEME_BUNDLE_IDS = Object.freeze([...BUNDLE_IDS]);

// src/ui/tokens/inject.ts
var _ALLOWED_KEYS = new Set(LVIS_TOKEN_NAMES);
var _UNSAFE_VALUE = /url\s*\(|expression\s*\(|<[a-zA-Z]/i;
function resolveElement(target) {
  if (target === void 0) {
    return typeof document === "undefined" ? null : document.documentElement;
  }
  if (target instanceof HTMLElement) return target;
  return target.documentElement;
}
function applyThemeTokens(tokens, target) {
  const root = resolveElement(target);
  if (!root) return;
  for (const [k, v] of Object.entries(tokens)) {
    if (!_ALLOWED_KEYS.has(k)) continue;
    if (_UNSAFE_VALUE.test(v)) continue;
    root.style.setProperty(k, v);
  }
}
function applyThemeFromHostEvent(event, target) {
  const root = resolveElement(target);
  if (!root) return;
  if (!event) {
    root.removeAttribute("data-theme-bundle");
    root.removeAttribute("data-shell");
    for (const tokenName of LVIS_TOKEN_NAMES) {
      root.style.removeProperty(tokenName);
    }
    return;
  }
  if (LVIS_THEME_BUNDLE_IDS.includes(event.bundleId)) {
    root.setAttribute("data-theme-bundle", event.bundleId);
  } else {
    root.removeAttribute("data-theme-bundle");
  }
  if (event.shell === "light" || event.shell === "dark") {
    root.setAttribute("data-shell", event.shell);
  } else {
    root.removeAttribute("data-shell");
  }
  if (event.tokens !== null && typeof event.tokens === "object" && !Array.isArray(event.tokens)) {
    applyThemeTokens(event.tokens, target);
  }
}

// src/ui/hooks/primeTheme.ts
function applyPayload(payload, opts) {
  if (!payload || typeof payload !== "object") return;
  const event = payload;
  applyThemeFromHostEvent(event, opts.target);
  if (opts.onPayload && event.bundleId && event.shell && event.tokens) {
    try {
      opts.onPayload(event);
    } catch (err) {
      console.warn("[lvis:primeTheme] onPayload callback threw", err);
    }
  }
}
function primeTheme(bridge, opts = {}) {
  const unsub = bridge.onEvent("host.theme.changed", (data) => {
    applyPayload(data, opts);
  });
  if (typeof bridge.getTheme === "function") {
    Promise.resolve(bridge.getTheme()).then((payload) => {
      if (payload) applyPayload(payload, opts);
    }).catch((err) => {
      console.warn("[lvis:primeTheme] getTheme() pull failed", err);
    });
  }
  return { dispose: unsub };
}
export {
  primeTheme
};
