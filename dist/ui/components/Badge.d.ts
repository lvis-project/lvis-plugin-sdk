import React from "react";
export type BadgeVariant = "default" | "success" | "warning" | "danger";
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}
export declare function Badge({ variant, className, children, ...rest }: BadgeProps): React.JSX.Element;
//# sourceMappingURL=Badge.d.ts.map