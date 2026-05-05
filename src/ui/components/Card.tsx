import React from "react";
import "../tokens/fallback.js";
import { injectTokenCss } from "../tokens/inject.js";

const CSS = `
.lvis-card {
  background: var(--lvis-surface); border: 1px solid var(--lvis-border);
  border-radius: var(--lvis-radius); padding: 1rem; color: var(--lvis-fg);
}
.lvis-card-sm { padding: 0.625rem; }
.lvis-card-lg { padding: 1.5rem; }
`;
injectTokenCss("lvis-card", CSS);

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}

export function Card({ padding = "md", className = "", children, ...rest }: CardProps) {
  const cls = ["lvis-card", padding !== "md" ? `lvis-card-${padding}` : "", className]
    .filter(Boolean).join(" ");
  return <div {...rest} className={cls}>{children}</div>;
}
