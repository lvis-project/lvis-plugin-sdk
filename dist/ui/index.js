import {
  LVIS_TOKEN_NAMES
} from "../chunk-AGR6M7NI.js";

// src/ui/tokens/inject.ts
var _ALLOWED_KEYS = new Set(LVIS_TOKEN_NAMES);
var _UNSAFE_VALUE = /url\s*\(|expression\s*\(|<[a-zA-Z]/i;
function injectTokenCss(id, css) {
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
.lvis-badge-success { background: var(--lvis-success); color: var(--lvis-bg); }
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
.lvis-checkbox-checked .lvis-checkbox-box::after { border-color: #fff; opacity: 1; }
.lvis-checkbox-indeterminate .lvis-checkbox-box {
  background: var(--lvis-primary); border-color: var(--lvis-primary);
}
.lvis-checkbox-indeterminate .lvis-checkbox-box::after {
  top: 50%; left: 2px; width: 8px; height: 0;
  border-color: transparent transparent transparent #fff;
  border-left: 8px solid #fff;
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
.lvis-select {
  display: block; width: 100%; padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 0.875rem; line-height: 1.5;
  color: var(--lvis-fg); background: var(--lvis-surface);
  border: 1px solid var(--lvis-border); border-radius: var(--lvis-radius-sm);
  outline: none; transition: border-color 0.15s;
  box-sizing: border-box; cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;
}
.lvis-select:focus { border-color: var(--lvis-ring); box-shadow: 0 0 0 2px color-mix(in srgb, var(--lvis-ring) 25%, transparent); }
.lvis-select:disabled { opacity: 0.5; cursor: not-allowed; }
`;
injectTokenCss("lvis-select", CSS8);
function Select({ className = "", children, ...rest }) {
  const cls = ["lvis-select", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx8("select", { ...rest, className: cls, children });
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
  background: #fff; border-radius: 9999px;
  transition: transform 0.2s;
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

// src/ui/hooks/useTheme.ts
import { useEffect } from "react";
var VALID_THEMES = /* @__PURE__ */ new Set(["light", "dark", "high-contrast"]);
var VALID_CHAT_THEMES = /* @__PURE__ */ new Set(["lg", "purple", "orange", "blue"]);
var VALID_CODE_THEMES = /* @__PURE__ */ new Set(["light", "dark"]);
var _ALLOWED_TOKEN_KEYS = new Set(LVIS_TOKEN_NAMES);
function useTheme(bridge) {
  useEffect(() => {
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
    });
    return unsub;
  }, [bridge]);
}
export {
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  LVIS_TOKEN_NAMES,
  Select,
  Spinner,
  Text,
  Toggle,
  applyThemeTokens,
  injectTokenCss,
  useTheme
};
