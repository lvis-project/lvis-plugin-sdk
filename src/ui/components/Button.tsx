import React from "react";
import "../tokens/fallback.js";
import { injectTokenCss } from "../tokens/inject.js";

const CSS = `
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

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary", size = "md", loading, children, className = "", disabled, ...rest
}: ButtonProps) {
  const cls = [
    "lvis-btn",
    `lvis-btn-${variant}`,
    size !== "md" ? `lvis-btn-${size}` : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <button {...rest} className={cls} disabled={disabled || loading}>
      {loading ? <ButtonSpinner size="sm" /> : null}
      {children}
    </button>
  );
}

function ButtonSpinner({ size }: { size: "sm" }) {
  const s = size === "sm" ? "0.875rem" : "1rem";
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      style={{ animation: "lvis-spin 0.75s linear infinite" }}>
      <style>{`@keyframes lvis-spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
        strokeDasharray="40 20" />
    </svg>
  );
}
