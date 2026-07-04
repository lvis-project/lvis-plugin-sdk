import React from "react";
export interface CheckboxProps {
    checked?: boolean;
    defaultChecked?: boolean;
    indeterminate?: boolean;
    onChange?: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    id?: string;
}
export declare function Checkbox({ checked, defaultChecked, indeterminate, onChange, label, disabled, id }: CheckboxProps): React.JSX.Element;
//# sourceMappingURL=Checkbox.d.ts.map