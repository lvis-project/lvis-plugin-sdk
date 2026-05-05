import React from "react";
import "../tokens/fallback.js";
import { injectTokenCss } from "../tokens/inject.js";

export type SpinnerSize = "sm" | "md" | "lg";

const SIZES: Record<SpinnerSize, string> = { sm: "1rem", md: "1.5rem", lg: "2rem" };

// Token references live in a CSS-string block so the build-time validator
// (which strips JSX/JS string-literal contents before scanning) can see them.
// JSX attribute strings like `stroke="var(--lvis-primary)"` would be erased
// by `stripCommentsAndStrings` and silently bypass the allowlist check.
const CSS = `
.lvis-spinner-circle { stroke: var(--lvis-primary); }
@keyframes lvis-spin { to { transform: rotate(360deg); } }
`;
injectTokenCss("lvis-spinner", CSS);

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const s = SIZES[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      className={className}
      style={{ animation: "lvis-spin 0.75s linear infinite", display: "inline-block" }}>
      <circle className="lvis-spinner-circle" cx="12" cy="12" r="10" strokeWidth="3"
        strokeDasharray="40 20" />
    </svg>
  );
}
