import React from "react";
import "../tokens/fallback.js";
import { injectTokenCss } from "../tokens/inject.js";

const CSS = `
.lvis-text { margin: 0; }
.lvis-text-body   { font-size: 0.875rem; color: var(--lvis-fg); line-height: 1.5; }
.lvis-text-muted  { font-size: 0.875rem; color: var(--lvis-fg-muted); line-height: 1.5; }
.lvis-text-label  { font-size: 0.75rem;  color: var(--lvis-fg-muted); font-weight: 500; line-height: 1.4; text-transform: uppercase; letter-spacing: 0.05em; }
.lvis-text-heading{ font-size: 1rem;     color: var(--lvis-fg); font-weight: 600; line-height: 1.4; }
`;
injectTokenCss("lvis-text", CSS);

export type TextVariant = "body" | "muted" | "label" | "heading";

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: TextVariant;
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3";
}

export function Text({ variant = "body", as: Tag = "p", className = "", children, ...rest }: TextProps) {
  const cls = ["lvis-text", `lvis-text-${variant}`, className].filter(Boolean).join(" ");
  return <Tag {...rest} className={cls}>{children}</Tag>;
}
