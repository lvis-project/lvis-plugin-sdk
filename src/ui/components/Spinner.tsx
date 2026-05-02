import React from "react";

export type SpinnerSize = "sm" | "md" | "lg";

const SIZES: Record<SpinnerSize, string> = { sm: "1rem", md: "1.5rem", lg: "2rem" };

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
      <style>{`@keyframes lvis-spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="var(--lvis-primary)" strokeWidth="3"
        strokeDasharray="40 20" />
    </svg>
  );
}
