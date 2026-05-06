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
var LVIS_CSS_ONLY_TOKEN_NAMES = [
  "--lvis-shadow-sm",
  "--lvis-shadow-md",
  "--lvis-easing"
];

// src/ui/tokens/inject.ts
var _ALLOWED_KEYS = new Set(LVIS_TOKEN_NAMES);
var _UNSAFE_VALUE = /url\s*\(|expression\s*\(|<[a-zA-Z]/i;
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
function applyThemeTokens(tokens) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) {
    if (!_ALLOWED_KEYS.has(k)) continue;
    if (_UNSAFE_VALUE.test(v)) continue;
    root.style.setProperty(k, v);
  }
}

// src/ui/tokens/fallback.ts
ensureFallback();

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

// src/ui/components/Card.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var CSS2 = `
.lvis-card {
  background: var(--lvis-surface); border: 1px solid var(--lvis-border);
  border-radius: var(--lvis-radius); padding: 1rem; color: var(--lvis-fg);
}
.lvis-card-sm { padding: 0.625rem; }
.lvis-card-lg { padding: 1.5rem; }
`;
injectTokenCss("lvis-card", CSS2);
function Card({ padding = "md", className = "", children, ...rest }) {
  const cls = ["lvis-card", padding !== "md" ? `lvis-card-${padding}` : "", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx2("div", { ...rest, className: cls, children });
}

// src/ui/components/Badge.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
var CSS3 = `
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
injectTokenCss("lvis-badge", CSS3);
function Badge({ variant = "default", className = "", children, ...rest }) {
  const cls = ["lvis-badge", `lvis-badge-${variant}`, className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx3("span", { ...rest, className: cls, children });
}

// src/ui/components/Text.tsx
import { jsx as jsx4 } from "react/jsx-runtime";
var CSS4 = `
.lvis-text { margin: 0; }
.lvis-text-body   { font-size: 0.875rem; color: var(--lvis-fg); line-height: 1.5; }
.lvis-text-muted  { font-size: 0.875rem; color: var(--lvis-fg-muted); line-height: 1.5; }
.lvis-text-label  { font-size: 0.75rem;  color: var(--lvis-fg-muted); font-weight: 500; line-height: 1.4; text-transform: uppercase; letter-spacing: 0.05em; }
.lvis-text-heading{ font-size: 1rem;     color: var(--lvis-fg); font-weight: 600; line-height: 1.4; }
`;
injectTokenCss("lvis-text", CSS4);
function Text({ variant = "body", as: Tag = "p", className = "", children, ...rest }) {
  const cls = ["lvis-text", `lvis-text-${variant}`, className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx4(Tag, { ...rest, className: cls, children });
}

// src/ui/components/Spinner.tsx
import { jsx as jsx5 } from "react/jsx-runtime";
var SIZES = { sm: "1rem", md: "1.5rem", lg: "2rem" };
var CSS5 = `
.lvis-spinner-circle { stroke: var(--lvis-primary); }
@keyframes lvis-spin { to { transform: rotate(360deg); } }
`;
injectTokenCss("lvis-spinner", CSS5);
function Spinner({ size = "md", className = "" }) {
  const s = SIZES[size];
  return /* @__PURE__ */ jsx5(
    "svg",
    {
      width: s,
      height: s,
      viewBox: "0 0 24 24",
      fill: "none",
      className,
      style: { animation: "lvis-spin 0.75s linear infinite", display: "inline-block" },
      children: /* @__PURE__ */ jsx5(
        "circle",
        {
          className: "lvis-spinner-circle",
          cx: "12",
          cy: "12",
          r: "10",
          strokeWidth: "3",
          strokeDasharray: "40 20"
        }
      )
    }
  );
}

// src/ui/components/Checkbox.tsx
import React from "react";
import { jsx as jsx6, jsxs as jsxs2 } from "react/jsx-runtime";
var CSS6 = `
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
injectTokenCss("lvis-checkbox", CSS6);
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
  return /* @__PURE__ */ jsxs2(
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
        /* @__PURE__ */ jsx6("span", { className: "lvis-checkbox-box" }),
        label && /* @__PURE__ */ jsx6("span", { className: "lvis-checkbox-label", children: label })
      ]
    }
  );
}

// src/ui/components/Input.tsx
import { jsx as jsx7 } from "react/jsx-runtime";
var CSS7 = `
.lvis-input {
  display: block; width: 100%; padding: 0.375rem 0.75rem;
  font-size: 0.875rem; line-height: 1.5;
  color: var(--lvis-fg); background: var(--lvis-surface);
  border: 1px solid var(--lvis-border); border-radius: var(--lvis-radius-sm);
  outline: none; transition: border-color 0.15s;
  box-sizing: border-box;
}
.lvis-input::placeholder { color: var(--lvis-fg-muted); }
.lvis-input:focus { border-color: var(--lvis-ring); box-shadow: 0 0 0 2px color-mix(in srgb, var(--lvis-ring) 25%, transparent); }
.lvis-input:disabled { opacity: 0.5; cursor: not-allowed; }
.lvis-input-error { border-color: var(--lvis-danger); }
.lvis-input-error:focus { border-color: var(--lvis-danger); box-shadow: 0 0 0 2px color-mix(in srgb, var(--lvis-danger) 25%, transparent); }
`;
injectTokenCss("lvis-input", CSS7);
function Input({ error, className = "", ...rest }) {
  const cls = ["lvis-input", error ? "lvis-input-error" : "", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx7("input", { ...rest, className: cls });
}

// src/ui/components/Select.tsx
import { jsx as jsx8 } from "react/jsx-runtime";
var CSS8 = `
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
injectTokenCss("lvis-select", CSS8);
function Select({ className = "", children, ...rest }) {
  const cls = ["lvis-select", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx8("div", { className: "lvis-select-wrapper", children: /* @__PURE__ */ jsx8("select", { ...rest, className: cls, children }) });
}

// src/ui/components/Toggle.tsx
import React2 from "react";
import { jsx as jsx9, jsxs as jsxs3 } from "react/jsx-runtime";
var CSS9 = `
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
injectTokenCss("lvis-toggle", CSS9);
function Toggle({ checked, defaultChecked, onChange, label, disabled, id }) {
  const [internal, setInternal] = React2.useState(defaultChecked ?? false);
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
  return /* @__PURE__ */ jsxs3(
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
        /* @__PURE__ */ jsx9("span", { className: "lvis-toggle-track", children: /* @__PURE__ */ jsx9("span", { className: "lvis-toggle-thumb" }) }),
        label && /* @__PURE__ */ jsx9("span", { className: "lvis-toggle-label", children: label })
      ]
    }
  );
}

// src/ui/components/Stack.tsx
import { jsx as jsx10 } from "react/jsx-runtime";
var CSS10 = `
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
injectTokenCss("lvis-stack", CSS10);
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
  return /* @__PURE__ */ jsx10(Tag, { ...rest, className: cls, children });
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
  return /* @__PURE__ */ jsx10(Tag, { ...rest, className: cls, children });
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

// src/ui/components/Modal.tsx
import * as React3 from "react";

// src/ui/hooks/useFocusTrap.ts
import { useEffect } from "react";
import { createFocusTrap } from "focus-trap";
function useFocusTrap(ref, active, options = {}) {
  const { initialFocus, allowOutsideClick } = options;
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    let trap;
    try {
      trap = createFocusTrap(node, {
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        returnFocusOnDeactivate: true,
        allowOutsideClick: allowOutsideClick ?? true,
        initialFocus,
        fallbackFocus: node
      });
      trap.activate();
    } catch (err) {
      console.warn("[lvis-plugin-sdk] focus-trap activation failed", err);
      return;
    }
    return () => {
      try {
        trap.deactivate();
      } catch {
      }
    };
  }, [active, ref, initialFocus, allowOutsideClick]);
}

// src/ui/components/Modal.tsx
import { jsx as jsx11, jsxs as jsxs4 } from "react/jsx-runtime";
var CSS11 = `
.lvis-modal-overlay {
  position: fixed; inset: 0;
  background: rgb(0 0 0 / 0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem; z-index: 1000;
  animation: lvis-modal-fade-in 0.15s ease-out;
}
.lvis-modal {
  background: var(--lvis-surface);
  color: var(--lvis-fg);
  border: 1px solid var(--lvis-border);
  border-radius: var(--lvis-radius);
  display: flex; flex-direction: column;
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  animation: lvis-modal-pop-in 0.18s ease-out;
}
.lvis-modal-sm { width: 360px; max-width: 100%; }
.lvis-modal-md { width: 520px; max-width: 100%; }
.lvis-modal-lg { width: 760px; max-width: 100%; }
.lvis-modal-head {
  padding: 1rem 1.25rem 0.5rem;
  display: flex; flex-direction: column; gap: 0.25rem;
}
.lvis-modal-title {
  font-size: 1.0625rem; font-weight: 600;
  margin: 0; color: var(--lvis-fg);
}
.lvis-modal-caption {
  font-size: 0.875rem; color: var(--lvis-fg-muted);
  margin: 0;
}
.lvis-modal-body {
  padding: 0.5rem 1.25rem 1rem;
  overflow-y: auto;
  flex: 1 1 auto;
  color: var(--lvis-fg);
}
.lvis-modal-foot {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--lvis-border);
  display: flex; gap: 0.5rem; justify-content: flex-end;
}
@keyframes lvis-modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes lvis-modal-pop-in {
  from { opacity: 0; transform: translateY(4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .lvis-modal-overlay, .lvis-modal { animation: none; }
}
`;
injectTokenCss("lvis-modal", CSS11);
var _scrollLockCount = 0;
var _scrollLockOriginal = "";
function Modal(props) {
  const {
    open,
    onClose,
    title,
    caption,
    children,
    footer,
    size = "md",
    disableDismiss = false,
    ariaLabel,
    testId
  } = props;
  const dialogRef = React3.useRef(null);
  const reactId = React3.useId();
  const titleId = `lvis-modal-title-${reactId}`;
  useFocusTrap(dialogRef, open);
  React3.useEffect(() => {
    if (!open || disableDismiss) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, disableDismiss, onClose]);
  React3.useEffect(() => {
    if (!open) return;
    if (_scrollLockCount === 0) {
      _scrollLockOriginal = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    _scrollLockCount++;
    return () => {
      _scrollLockCount--;
      if (_scrollLockCount === 0) {
        document.body.style.overflow = _scrollLockOriginal;
      }
    };
  }, [open]);
  if (!open) return null;
  const titleIsString = typeof title === "string";
  return /* @__PURE__ */ jsx11(
    "div",
    {
      className: "lvis-modal-overlay",
      role: "presentation",
      "data-testid": testId,
      onClick: (e) => {
        if (disableDismiss) return;
        if (e.target === e.currentTarget) onClose();
      },
      children: /* @__PURE__ */ jsxs4(
        "div",
        {
          ref: dialogRef,
          className: `lvis-modal lvis-modal-${size}`,
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": titleIsString ? titleId : void 0,
          "aria-label": !titleIsString ? ariaLabel : void 0,
          tabIndex: -1,
          children: [
            (title !== void 0 || caption !== void 0) && /* @__PURE__ */ jsxs4("div", { className: "lvis-modal-head", children: [
              title !== void 0 && (titleIsString ? /* @__PURE__ */ jsx11("h2", { id: titleId, className: "lvis-modal-title", children: title }) : /* @__PURE__ */ jsx11("div", { className: "lvis-modal-title", children: title })),
              caption !== void 0 && /* @__PURE__ */ jsx11("p", { className: "lvis-modal-caption", children: caption })
            ] }),
            /* @__PURE__ */ jsx11("div", { className: "lvis-modal-body", children }),
            footer !== void 0 && /* @__PURE__ */ jsx11("div", { className: "lvis-modal-foot", children: footer })
          ]
        }
      )
    }
  );
}

// src/ui/hooks/useTheme.ts
import { useEffect as useEffect3 } from "react";
var VALID_THEMES = /* @__PURE__ */ new Set(["light", "dark", "high-contrast"]);
var VALID_CHAT_THEMES = /* @__PURE__ */ new Set(["lg", "purple", "orange", "blue"]);
var VALID_CODE_THEMES = /* @__PURE__ */ new Set(["light", "dark"]);
var _ALLOWED_TOKEN_KEYS = new Set(LVIS_TOKEN_NAMES);
function useTheme(bridge) {
  useEffect3(() => {
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
  Badge,
  Button,
  Card,
  Checkbox,
  Inline,
  Input,
  LVIS_CSS_ONLY_TOKEN_NAMES,
  LVIS_TOKEN_NAMES,
  Modal,
  Select,
  Spinner,
  Stack,
  Text,
  Toggle,
  applyThemeTokens,
  injectTokenCss,
  useFocusTrap,
  useTheme
};
