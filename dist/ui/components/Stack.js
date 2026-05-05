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

// src/ui/components/Stack.tsx
import { jsx } from "react/jsx-runtime";
var CSS = `
.lvis-stack { display: flex; }
.lvis-stack-vertical   { flex-direction: column; }
.lvis-stack-horizontal { flex-direction: row; }

.lvis-stack-gap-xs { gap: 0.25rem; }
.lvis-stack-gap-sm { gap: 0.5rem; }
.lvis-stack-gap-md { gap: 0.75rem; }
.lvis-stack-gap-lg { gap: 1rem; }
.lvis-stack-gap-xl { gap: 1.5rem; }

.lvis-stack-align-start    { align-items: flex-start; }
.lvis-stack-align-center   { align-items: center; }
.lvis-stack-align-end      { align-items: flex-end; }
.lvis-stack-align-stretch  { align-items: stretch; }

.lvis-stack-justify-start   { justify-content: flex-start; }
.lvis-stack-justify-center  { justify-content: center; }
.lvis-stack-justify-end     { justify-content: flex-end; }
.lvis-stack-justify-between { justify-content: space-between; }
.lvis-stack-justify-around  { justify-content: space-around; }

.lvis-stack-wrap { flex-wrap: wrap; }
`;
injectTokenCss("lvis-stack", CSS);
function Stack({
  gap = "md",
  align,
  justify,
  as: Tag = "div",
  className = "",
  children,
  ...rest
}) {
  const cls = buildClass("vertical", gap, align, justify, false, className);
  return /* @__PURE__ */ jsx(Tag, { ...rest, className: cls, children });
}
function Inline({
  gap = "sm",
  align,
  justify,
  wrap = false,
  as: Tag = "div",
  className = "",
  children,
  ...rest
}) {
  const cls = buildClass("horizontal", gap, align, justify, wrap, className);
  return /* @__PURE__ */ jsx(Tag, { ...rest, className: cls, children });
}
function buildClass(direction, gap, align, justify, wrap, extra) {
  return [
    "lvis-stack",
    `lvis-stack-${direction}`,
    `lvis-stack-gap-${gap}`,
    align ? `lvis-stack-align-${align}` : "",
    justify ? `lvis-stack-justify-${justify}` : "",
    wrap ? "lvis-stack-wrap" : "",
    extra
  ].filter(Boolean).join(" ");
}
export {
  Inline,
  Stack
};
