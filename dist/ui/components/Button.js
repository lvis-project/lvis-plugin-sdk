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
var _FALLBACK_CSS = `:root {
  --lvis-bg:           hsl(222.2, 84%, 4.9%);
  --lvis-surface:      hsl(222.2, 84%, 7%);
  --lvis-fg:           hsl(210, 40%, 98%);
  --lvis-fg-muted:     hsl(215, 20%, 65%);
  --lvis-primary:      hsl(217.2, 91.2%, 59.8%);
  --lvis-primary-fg:   hsl(210, 40%, 98%);
  --lvis-secondary:    hsl(217, 33%, 17%);
  --lvis-secondary-fg: hsl(210, 40%, 98%);
  --lvis-danger:       hsl(0, 62.8%, 30.6%);
  --lvis-danger-fg:    hsl(210, 40%, 98%);
  --lvis-warning:      hsl(48, 97%, 77%);
  --lvis-warning-fg:   hsl(30, 80%, 25%);
  --lvis-success:      hsl(142, 71%, 45%);
  --lvis-border:       hsl(217, 33%, 17%);
  --lvis-ring:         hsl(224.3, 76.3%, 48%);
  --lvis-radius:       0.6rem;
  --lvis-radius-sm:    0.25rem;
}`;
var _fallbackEnsured = false;
function ensureFallback() {
  if (_fallbackEnsured) return;
  if (typeof document === "undefined") return;
  _fallbackEnsured = true;
  if (document.getElementById("lvis-tokens-fallback")) return;
  const el = document.createElement("style");
  el.id = "lvis-tokens-fallback";
  el.textContent = _FALLBACK_CSS;
  document.head.appendChild(el);
}
function injectTokenCss(id, css) {
  ensureFallback();
  if (typeof document === "undefined") return;
  const existing = document.getElementById(id);
  if (existing) {
    if (existing.textContent !== css) existing.textContent = css;
    return;
  }
  const el = document.createElement("style");
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}

// src/ui/components/Button.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var CSS = `
.lvis-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 0.375rem; padding: 0.375rem 0.875rem;
  border-radius: var(--lvis-radius-sm); font-size: 0.875rem; font-weight: 500;
  border: 1px solid transparent; cursor: pointer; transition: opacity 0.15s;
  outline: none; line-height: 1.5;
}
.lvis-btn:focus-visible { box-shadow: 0 0 0 2px var(--lvis-ring); }
.lvis-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.lvis-btn-primary {
  background: var(--lvis-primary); color: var(--lvis-primary-fg);
}
.lvis-btn-primary:hover:not(:disabled) { opacity: 0.85; }
.lvis-btn-secondary {
  background: var(--lvis-secondary); color: var(--lvis-secondary-fg);
  border-color: var(--lvis-fg-muted);
}
.lvis-btn-secondary:hover:not(:disabled) { background: var(--lvis-surface); border-color: var(--lvis-fg); }
.lvis-btn-ghost {
  background: transparent; color: var(--lvis-fg);
}
.lvis-btn-ghost:hover:not(:disabled) { background: var(--lvis-surface); }
.lvis-btn-danger {
  background: var(--lvis-danger); color: var(--lvis-danger-fg);
}
.lvis-btn-danger:hover:not(:disabled) { opacity: 0.85; }
.lvis-btn-sm { padding: 0.25rem 0.625rem; font-size: 0.75rem; }
.lvis-btn-lg { padding: 0.5rem 1.125rem; font-size: 1rem; }
`;
injectTokenCss("lvis-btn", CSS);
function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className = "",
  disabled,
  ...rest
}) {
  const cls = [
    "lvis-btn",
    `lvis-btn-${variant}`,
    size !== "md" ? `lvis-btn-${size}` : "",
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs("button", { ...rest, className: cls, disabled: disabled || loading, children: [
    loading ? /* @__PURE__ */ jsx(ButtonSpinner, { size: "sm" }) : null,
    children
  ] });
}
function ButtonSpinner({ size }) {
  const s = size === "sm" ? "0.875rem" : "1rem";
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      width: s,
      height: s,
      viewBox: "0 0 24 24",
      fill: "none",
      style: { animation: "lvis-spin 0.75s linear infinite" },
      children: [
        /* @__PURE__ */ jsx("style", { children: `@keyframes lvis-spin{to{transform:rotate(360deg)}}` }),
        /* @__PURE__ */ jsx(
          "circle",
          {
            cx: "12",
            cy: "12",
            r: "10",
            stroke: "currentColor",
            strokeWidth: "3",
            strokeDasharray: "40 20"
          }
        )
      ]
    }
  );
}
export {
  Button
};
