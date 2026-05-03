import React from "react";
import { injectTokenCss } from "../tokens/inject.js";

const CSS = `
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

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = "", children, ...rest }: SelectProps) {
  injectTokenCss("lvis-select", CSS);
  const cls = ["lvis-select", className].filter(Boolean).join(" ");
  return <select {...rest} className={cls}>{children}</select>;
}
