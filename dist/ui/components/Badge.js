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
function injectTokenCss(id, css, targetDoc) {
  const doc = targetDoc ?? (typeof document === "undefined" ? null : document);
  if (!doc) return;
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

// src/ui/components/Badge.tsx
import { jsx } from "react/jsx-runtime";
var CSS = `
.lvis-badge {
  display: inline-flex; align-items: center;
  padding: 0.125rem 0.5rem; border-radius: 9999px;
  font-size: 0.75rem; font-weight: 500; line-height: 1.5;
}
.lvis-badge-default { background: var(--lvis-secondary); color: var(--lvis-secondary-fg); }
.lvis-badge-success { background: var(--lvis-success); color: var(--lvis-success-fg); }
.lvis-badge-warning { background: var(--lvis-warning); color: var(--lvis-warning-fg); }
.lvis-badge-danger  { background: var(--lvis-danger);  color: var(--lvis-danger-fg); }
`;
injectTokenCss("lvis-badge", CSS);
function Badge({ variant = "default", className = "", children, ...rest }) {
  const cls = ["lvis-badge", `lvis-badge-${variant}`, className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx("span", { ...rest, className: cls, children });
}
export {
  Badge
};
