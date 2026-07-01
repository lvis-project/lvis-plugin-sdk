// src/ui/tokens/theme-bundles.ts
var BUNDLE_IDS = [
  "cherry-blossom",
  "tokyo-night",
  "midnight",
  "forest",
  "violet-light",
  "violet-dark",
  "high-contrast",
  "catppuccin-mocha",
  "catppuccin-latte",
  "nord",
  "gruvbox-dark-hard",
  "solarized-light",
  "rose-pine",
  "executive-graphite"
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
  // Derived tinted-surface tokens — pre-computed color-mix values shipped by the host.
  // Plugins use these directly instead of reinventing color-mix derivations.
  "--lvis-danger-bg-subtle",
  "--lvis-focus-shadow",
  "--lvis-primary-bg-strong",
  "--lvis-primary-bg-subtle",
  "--lvis-success-bg-subtle",
  "--lvis-surface-hover",
  "--lvis-warning-bg-subtle",
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
var _DOC_NODE = 9;
var _ELEMENT_NODE = 1;
function isDocument(value) {
  return typeof value === "object" && value !== null && value.nodeType === _DOC_NODE;
}
function isHtmlElement(value) {
  return typeof value === "object" && value !== null && value.nodeType === _ELEMENT_NODE && typeof value.ownerDocument !== "undefined";
}
function resolveElement(target) {
  if (target == null) {
    return typeof document === "undefined" ? null : document.documentElement;
  }
  if (isHtmlElement(target)) return target;
  if (isDocument(target)) return target.documentElement;
  return null;
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
    try {
      Promise.resolve(bridge.getTheme()).then((payload) => {
        if (payload) applyPayload(payload, opts);
      }).catch((err) => {
        console.warn("[lvis:primeTheme] getTheme() pull failed", err);
      });
    } catch (err) {
      console.warn("[lvis:primeTheme] getTheme() threw synchronously", err);
    }
  }
  return { dispose: unsub };
}
export {
  primeTheme
};
