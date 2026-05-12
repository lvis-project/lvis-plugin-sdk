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

// src/ui/components/Select.tsx
import { jsx } from "react/jsx-runtime";
var CSS = `
.lvis-select-wrapper {
  position: relative; display: block; width: 100%;
}
.lvis-select {
  display: block; width: 100%; padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 0.875rem; line-height: 1.5;
  color: var(--lvis-fg); background: var(--lvis-surface);
  border: 1px solid var(--lvis-border); border-radius: var(--lvis-radius-sm);
  outline: none; transition: border-color 0.15s;
  box-sizing: border-box; cursor: pointer;
  appearance: none;
}
.lvis-select:focus { border-color: var(--lvis-ring); box-shadow: 0 0 0 2px color-mix(in srgb, var(--lvis-ring) 25%, transparent); }
.lvis-select:disabled { opacity: 0.5; cursor: not-allowed; }
.lvis-select-wrapper::after {
  content: "";
  position: absolute; right: 0.75rem; top: 50%;
  transform: translateY(-60%);
  pointer-events: none;
  width: 0; height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--lvis-fg-muted);
}
`;
injectTokenCss("lvis-select", CSS);
function Select({ className = "", children, ...rest }) {
  const cls = ["lvis-select", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx("div", { className: "lvis-select-wrapper", children: /* @__PURE__ */ jsx("select", { ...rest, className: cls, children }) });
}
export {
  Select
};
