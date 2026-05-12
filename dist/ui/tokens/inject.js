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

// src/ui/tokens/_generated-fallback-css.ts
var _FALLBACK_CSS = `:root {
  --lvis-bg:               hsl(222.2, 84%, 4.9%);
  --lvis-surface:          hsl(222.2, 84%, 7%);
  --lvis-surface-overlay:  hsl(222.2, 60%, 10%);
  --lvis-fg:               hsl(210, 40%, 98%);
  --lvis-fg-muted:         hsl(215, 20%, 65%);
  --lvis-fg-disabled:      hsl(215, 16%, 40%);
  --lvis-primary:          hsl(217.2, 91.2%, 59.8%);
  --lvis-primary-fg:       hsl(210, 40%, 98%);
  --lvis-secondary:        hsl(217, 33%, 17%);
  --lvis-secondary-fg:     hsl(210, 40%, 98%);
  --lvis-danger:           hsl(0, 62.8%, 30.6%);
  --lvis-danger-fg:        hsl(210, 40%, 98%);
  --lvis-warning:          hsl(48, 97%, 77%);
  --lvis-warning-fg:       hsl(30, 80%, 25%);
  --lvis-success:          hsl(142, 71%, 45%);
  --lvis-success-fg:       hsl(210, 40%, 98%);
  --lvis-border:           hsl(217, 33%, 17%);
  --lvis-ring:             hsl(224.3, 76.3%, 48%);
  --lvis-radius-xs:        0.15rem;
  --lvis-radius-sm:        0.25rem;
  --lvis-radius:           0.6rem;
  --lvis-radius-lg:        0.75rem;
  --lvis-radius-full:      9999px;
  --lvis-text-xs:          0.75rem;
  --lvis-text-sm:          0.875rem;
  --lvis-text-base:        1rem;
  --lvis-text-lg:          1.125rem;
  --lvis-weight-normal:    400;
  --lvis-weight-medium:    500;
  --lvis-weight-semibold:  600;
  --lvis-space-1:          0.25rem;
  --lvis-space-2:          0.5rem;
  --lvis-space-3:          0.75rem;
  --lvis-space-4:          1rem;
  --lvis-motion-fast:      150ms;
  --lvis-motion-normal:    200ms;
  --lvis-shadow-sm:        0 1px 3px hsl(222, 84%, 5%, 0.4);
  --lvis-shadow-md:        0 4px 12px hsl(222, 84%, 5%, 0.6);
  --lvis-easing:           cubic-bezier(0.4, 0, 0.2, 1);
}`;

// src/ui/tokens/inject.ts
var _ALLOWED_KEYS = new Set(LVIS_TOKEN_NAMES);
var _UNSAFE_VALUE = /url\s*\(|expression\s*\(|<[a-zA-Z]/i;
var _fallbackEnsured = /* @__PURE__ */ new WeakSet();
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
function ensureFallback(targetDoc) {
  const doc = targetDoc ?? (typeof document === "undefined" ? null : document);
  if (!doc) return;
  if (_fallbackEnsured.has(doc)) return;
  _fallbackEnsured.add(doc);
  if (doc.getElementById("lvis-tokens-fallback")) return;
  const el = doc.createElement("style");
  el.id = "lvis-tokens-fallback";
  el.textContent = _FALLBACK_CSS;
  doc.head.appendChild(el);
}
function injectTokenCss(id, css, targetDoc) {
  const doc = targetDoc ?? (typeof document === "undefined" ? null : document);
  if (!doc) return;
  ensureFallback(doc);
  const existing = doc.getElementById(id);
  if (existing) {
    if (existing.textContent !== css) existing.textContent = css;
    return;
  }
  const el = doc.createElement("style");
  el.id = id;
  el.textContent = css;
  doc.head.appendChild(el);
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
export {
  applyThemeFromHostEvent,
  applyThemeTokens,
  ensureFallback,
  injectTokenCss
};
