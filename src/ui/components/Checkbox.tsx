import React from "react";
import "../tokens/fallback.js";
import { injectTokenCss } from "../tokens/inject.js";

const CSS = `
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
injectTokenCss("lvis-checkbox", CSS);

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Checkbox({ checked, defaultChecked, indeterminate, onChange, label, disabled, id }: CheckboxProps) {
  const [internal, setInternal] = React.useState(defaultChecked ?? false);
  const isOn = checked !== undefined ? checked : internal;

  const handleClick = () => {
    if (disabled) return;
    const next = !isOn;
    if (checked === undefined) setInternal(next);
    onChange?.(next);
  };

  const cls = [
    "lvis-checkbox",
    isOn && !indeterminate ? "lvis-checkbox-checked" : "",
    indeterminate ? "lvis-checkbox-indeterminate" : "",
    disabled ? "lvis-checkbox-disabled" : "",
  ].filter(Boolean).join(" ");

  return (
    <div id={id} role="checkbox" aria-checked={indeterminate ? "mixed" : isOn} aria-disabled={disabled ?? false}
      className={cls} onClick={handleClick} tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); handleClick(); } }}>
      <span className="lvis-checkbox-box" />
      {label && <span className="lvis-checkbox-label">{label}</span>}
    </div>
  );
}
