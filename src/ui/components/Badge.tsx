import React from "react";
import { injectTokenCss } from "../tokens/inject.js";

const CSS = `
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

export type BadgeVariant = "default" | "success" | "warning" | "danger";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "default", className = "", children, ...rest }: BadgeProps) {
  injectTokenCss("lvis-badge", CSS);
  const cls = ["lvis-badge", `lvis-badge-${variant}`, className].filter(Boolean).join(" ");
  return <span {...rest} className={cls}>{children}</span>;
}
