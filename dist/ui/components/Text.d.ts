import React from "react";
export type TextVariant = "body" | "muted" | "label" | "heading";
export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
    variant?: TextVariant;
    as?: "p" | "span" | "div" | "h1" | "h2" | "h3";
}
export declare function Text({ variant, as: Tag, className, children, ...rest }: TextProps): React.JSX.Element;
//# sourceMappingURL=Text.d.ts.map