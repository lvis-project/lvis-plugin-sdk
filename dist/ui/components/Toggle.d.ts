import React from "react";
export interface ToggleProps {
    checked?: boolean;
    defaultChecked?: boolean;
    onChange?: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    id?: string;
    className?: string;
    style?: React.CSSProperties;
}
export declare function Toggle({ checked, defaultChecked, onChange, label, disabled, id, className, style }: ToggleProps): React.JSX.Element;
//# sourceMappingURL=Toggle.d.ts.map