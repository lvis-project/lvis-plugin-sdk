// src/ui/components/Toggle.tsx
import React from "react";

// src/ui/tokens/theme-bundles.ts
var BUNDLE_IDS = [
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

// src/ui/components/Toggle.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var CSS = `
.lvis-toggle {
  display: inline-flex; align-items: center; gap: 0.5rem;
  cursor: pointer; user-select: none;
}
.lvis-toggle-track {
  position: relative; flex-shrink: 0;
  width: 2.25rem; height: 1.25rem;
  background: var(--lvis-border); border-radius: 9999px;
  transition: background 0.2s;
}
.lvis-toggle-thumb {
  position: absolute; top: 0.125rem; left: 0.125rem;
  width: 1rem; height: 1rem;
  background: var(--lvis-bg); border-radius: 9999px;
  transition: transform 0.2s, background 0.18s;
  pointer-events: none;
}
.lvis-toggle-checked .lvis-toggle-track { background: var(--lvis-primary); }
.lvis-toggle-checked .lvis-toggle-thumb { transform: translateX(1rem); }
.lvis-toggle-disabled { opacity: 0.5; cursor: not-allowed; }
.lvis-toggle-label { font-size: 0.875rem; color: var(--lvis-fg); }
`;
injectTokenCss("lvis-toggle", CSS);
function Toggle({ checked, defaultChecked, onChange, label, disabled, id }) {
  const [internal, setInternal] = React.useState(defaultChecked ?? false);
  const isOn = checked !== void 0 ? checked : internal;
  const handleClick = () => {
    if (disabled) return;
    const next = !isOn;
    if (checked === void 0) setInternal(next);
    onChange?.(next);
  };
  const cls = [
    "lvis-toggle",
    isOn ? "lvis-toggle-checked" : "",
    disabled ? "lvis-toggle-disabled" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs(
    "div",
    {
      id,
      role: "switch",
      "aria-checked": isOn,
      "aria-disabled": disabled ?? false,
      className: cls,
      onClick: handleClick,
      tabIndex: disabled ? -1 : 0,
      onKeyDown: (e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleClick();
        }
      },
      children: [
        /* @__PURE__ */ jsx("span", { className: "lvis-toggle-track", children: /* @__PURE__ */ jsx("span", { className: "lvis-toggle-thumb" }) }),
        label && /* @__PURE__ */ jsx("span", { className: "lvis-toggle-label", children: label })
      ]
    }
  );
}
export {
  Toggle
};
