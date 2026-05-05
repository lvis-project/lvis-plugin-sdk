import React from "react";
import "../tokens/fallback.js";
import { injectTokenCss } from "../tokens/inject.js";

const CSS = `
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
injectTokenCss("lvis-input", CSS);

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = "", ...rest }: InputProps) {
  const cls = ["lvis-input", error ? "lvis-input-error" : "", className].filter(Boolean).join(" ");
  return <input {...rest} className={cls} />;
}
