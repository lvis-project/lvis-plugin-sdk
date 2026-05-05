import React from "react";
import "../tokens/fallback.js";
import { injectTokenCss } from "../tokens/inject.js";

const CSS = `
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
injectTokenCss("lvis-toggle", CSS);

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Toggle({ checked, defaultChecked, onChange, label, disabled, id }: ToggleProps) {
  const [internal, setInternal] = React.useState(defaultChecked ?? false);
  const isOn = checked !== undefined ? checked : internal;

  const handleClick = () => {
    if (disabled) return;
    const next = !isOn;
    if (checked === undefined) setInternal(next);
    onChange?.(next);
  };

  const cls = [
    "lvis-toggle",
    isOn ? "lvis-toggle-checked" : "",
    disabled ? "lvis-toggle-disabled" : "",
  ].filter(Boolean).join(" ");

  return (
    <div id={id} role="switch" aria-checked={isOn} aria-disabled={disabled ?? false}
      className={cls} onClick={handleClick} tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); handleClick(); } }}>
      <span className="lvis-toggle-track">
        <span className="lvis-toggle-thumb" />
      </span>
      {label && <span className="lvis-toggle-label">{label}</span>}
    </div>
  );
}
