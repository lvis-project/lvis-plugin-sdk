import React from "react";
import { injectTokenCss } from "../tokens/inject.js";

// Spacing scale is hardcoded in rems rather than read from design
// tokens — there is no spacing token set in `LVIS_TOKEN_NAMES` today,
// and existing components (Card / Text / Button) also hardcode their
// padding/gap values. If a spacing token set is later added to the
// host SoT, swap these to `var()` references at that time.
const CSS = `
.lvis-stack { display: flex; }
.lvis-stack-vertical   { flex-direction: column; }
.lvis-stack-horizontal { flex-direction: row; }

.lvis-stack-gap-xs { gap: 0.25rem; }
.lvis-stack-gap-sm { gap: 0.5rem; }
.lvis-stack-gap-md { gap: 0.75rem; }
.lvis-stack-gap-lg { gap: 1rem; }
.lvis-stack-gap-xl { gap: 1.5rem; }

.lvis-stack-align-start    { align-items: flex-start; }
.lvis-stack-align-center   { align-items: center; }
.lvis-stack-align-end      { align-items: flex-end; }
.lvis-stack-align-stretch  { align-items: stretch; }

.lvis-stack-justify-start   { justify-content: flex-start; }
.lvis-stack-justify-center  { justify-content: center; }
.lvis-stack-justify-end     { justify-content: flex-end; }
.lvis-stack-justify-between { justify-content: space-between; }
.lvis-stack-justify-around  { justify-content: space-around; }

.lvis-stack-wrap { flex-wrap: wrap; }
`;
injectTokenCss("lvis-stack", CSS);

export type StackGap = "xs" | "sm" | "md" | "lg" | "xl";
export type StackAlign = "start" | "center" | "end" | "stretch";
export type StackJustify = "start" | "center" | "end" | "between" | "around";

interface StackBaseProps extends React.HTMLAttributes<HTMLElement> {
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  /** Element override — defaults to `div`. Use `section`/`ul`/`nav`/etc. for semantic markup. */
  as?: "div" | "section" | "nav" | "header" | "footer" | "ul" | "ol" | "li" | "article" | "aside";
}

export interface StackProps extends StackBaseProps {}

/** Vertical flex stack. Default `gap="md"`. */
export function Stack({
  gap = "md", align, justify, as: Tag = "div", className = "", children, ...rest
}: StackProps) {
  const cls = buildClass("vertical", gap, align, justify, false, className);
  return <Tag {...rest} className={cls}>{children}</Tag>;
}

export interface InlineProps extends StackBaseProps {
  /** Wrap to next line when out of horizontal space. Defaults to `false`. */
  wrap?: boolean;
}

/** Horizontal flex stack. Default `gap="sm"`. Common alias for left-to-right rows of badges/buttons. */
export function Inline({
  gap = "sm", align, justify, wrap = false, as: Tag = "div", className = "", children, ...rest
}: InlineProps) {
  const cls = buildClass("horizontal", gap, align, justify, wrap, className);
  return <Tag {...rest} className={cls}>{children}</Tag>;
}

function buildClass(
  direction: "vertical" | "horizontal",
  gap: StackGap,
  align: StackAlign | undefined,
  justify: StackJustify | undefined,
  wrap: boolean,
  extra: string,
): string {
  return [
    "lvis-stack",
    `lvis-stack-${direction}`,
    `lvis-stack-gap-${gap}`,
    align ? `lvis-stack-align-${align}` : "",
    justify ? `lvis-stack-justify-${justify}` : "",
    wrap ? "lvis-stack-wrap" : "",
    extra,
  ].filter(Boolean).join(" ");
}
