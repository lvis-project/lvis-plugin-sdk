import React from "react";
import "../tokens/fallback.js";
import { injectTokenCss } from "../tokens/inject.js";

const CSS = `
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

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = "", children, ...rest }: SelectProps) {
  const cls = ["lvis-select", className].filter(Boolean).join(" ");
  return (
    <div className="lvis-select-wrapper">
      <select {...rest} className={cls}>{children}</select>
    </div>
  );
}
