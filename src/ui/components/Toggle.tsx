import React from "react";
import { injectTokenCss } from "../tokens/inject.js";

const CSS = `
.lvis-toggle {
  display: inline-flex; align-items: center; gap: 0.5rem;
  cursor: pointer; user-select: none;
}
.lvis-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.lvis-toggle-track {
  position: relative; width: 2.25rem; height: 1.25rem;
  background: var(--lvis-border); border-radius: 9999px;
  transition: background 0.2s;
  flex-shrink: 0;
}
.lvis-toggle input:checked + .lvis-toggle-track { background: var(--lvis-primary); }
.lvis-toggle input:focus-visible + .lvis-toggle-track { box-shadow: 0 0 0 2px var(--lvis-ring); }
.lvis-toggle input:disabled + .lvis-toggle-track { opacity: 0.5; cursor: not-allowed; }
.lvis-toggle-thumb {
  position: absolute; top: 0.125rem; left: 0.125rem;
  width: 1rem; height: 1rem;
  background: #fff; border-radius: 9999px;
  transition: transform 0.2s;
}
.lvis-toggle input:checked ~ .lvis-toggle-track .lvis-toggle-thumb { transform: translateX(1rem); }
.lvis-toggle-label { font-size: 0.875rem; color: var(--lvis-fg); }
`;

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Toggle({ checked, defaultChecked, onChange, label, disabled, id }: ToggleProps) {
  injectTokenCss("lvis-toggle", CSS);
  return (
    <label className="lvis-toggle">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="lvis-toggle-track">
        <span className="lvis-toggle-thumb" />
      </span>
      {label && <span className="lvis-toggle-label">{label}</span>}
    </label>
  );
}
