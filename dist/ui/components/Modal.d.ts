import * as React from "react";
export interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    caption?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    size?: "sm" | "md" | "lg";
    /** When true, Esc and overlay click are ignored (e.g. while busy). */
    disableDismiss?: boolean;
    /** Accessible name used when title is not a plain string or is omitted. */
    ariaLabel?: string;
    /** data-testid on the overlay element. */
    testId?: string;
}
export declare function Modal(props: ModalProps): React.ReactElement | null;
//# sourceMappingURL=Modal.d.ts.map