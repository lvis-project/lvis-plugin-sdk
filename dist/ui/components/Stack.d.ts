import React from "react";
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
export interface StackProps extends StackBaseProps {
}
/** Vertical flex stack. Default `gap="md"`. */
export declare function Stack({ gap, align, justify, as: Tag, className, children, ...rest }: StackProps): import("react/jsx-runtime").JSX.Element;
export interface InlineProps extends StackBaseProps {
    /** Wrap to next line when out of horizontal space. Defaults to `false`. */
    wrap?: boolean;
}
/** Horizontal flex stack. Default `gap="sm"`. Common alias for left-to-right rows of badges/buttons. */
export declare function Inline({ gap, align, justify, wrap, as: Tag, className, children, ...rest }: InlineProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Stack.d.ts.map