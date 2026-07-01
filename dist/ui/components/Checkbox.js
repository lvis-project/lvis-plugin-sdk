// src/ui/components/Checkbox.tsx
import React from "react";

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

// src/ui/components/Checkbox.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var CSS = `
.lvis-checkbox {
  display: inline-flex; align-items: center; gap: 0.5rem;
  cursor: pointer; user-select: none;
}
.lvis-checkbox-box {
  position: relative; flex-shrink: 0;
  width: 1rem; height: 1rem;
  border: 1.5px solid var(--lvis-border); border-radius: 0.2rem;
  background: var(--lvis-surface); transition: background 0.15s, border-color 0.15s;
}
.lvis-checkbox-checked .lvis-checkbox-box {
  background: var(--lvis-primary); border-color: var(--lvis-primary);
}
.lvis-checkbox-box::after {
  content: "";
  position: absolute; top: 1px; left: 3px;
  width: 5px; height: 8px;
  border: 2px solid transparent; border-top: none; border-left: none;
  transform: rotate(45deg);
  opacity: 0; transition: opacity 0.1s;
}
.lvis-checkbox-checked .lvis-checkbox-box::after { border-color: var(--lvis-primary-fg); opacity: 1; }
.lvis-checkbox-indeterminate .lvis-checkbox-box {
  background: var(--lvis-primary); border-color: var(--lvis-primary);
}
.lvis-checkbox-indeterminate .lvis-checkbox-box::after {
  top: 50%; left: 2px; width: 8px; height: 0;
  border-color: transparent transparent transparent var(--lvis-primary-fg);
  border-left: 8px solid var(--lvis-primary-fg);
  border-top: none; border-right: none;
  transform: translateY(-50%) rotate(0deg);
  opacity: 1;
}
.lvis-checkbox:focus-visible .lvis-checkbox-box {
  box-shadow: 0 0 0 2px var(--lvis-ring);
}
.lvis-checkbox-disabled { opacity: 0.5; cursor: not-allowed; }
.lvis-checkbox-label { font-size: 0.875rem; color: var(--lvis-fg); }
`;
injectTokenCss("lvis-checkbox", CSS);
function Checkbox({ checked, defaultChecked, indeterminate, onChange, label, disabled, id }) {
  const [internal, setInternal] = React.useState(defaultChecked ?? false);
  const isOn = checked !== void 0 ? checked : internal;
  const handleClick = () => {
    if (disabled) return;
    const next = !isOn;
    if (checked === void 0) setInternal(next);
    onChange?.(next);
  };
  const cls = [
    "lvis-checkbox",
    isOn && !indeterminate ? "lvis-checkbox-checked" : "",
    indeterminate ? "lvis-checkbox-indeterminate" : "",
    disabled ? "lvis-checkbox-disabled" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs(
    "div",
    {
      id,
      role: "checkbox",
      "aria-checked": indeterminate ? "mixed" : isOn,
      "aria-disabled": disabled ?? false,
      className: cls,
      onClick: handleClick,
      tabIndex: disabled ? -1 : 0,
      onKeyDown: (e) => {
        if (e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      },
      children: [
        /* @__PURE__ */ jsx("span", { className: "lvis-checkbox-box" }),
        label && /* @__PURE__ */ jsx("span", { className: "lvis-checkbox-label", children: label })
      ]
    }
  );
}
export {
  Checkbox
};
