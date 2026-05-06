import { type RefObject } from "react";
export interface UseFocusTrapOptions {
    /**
     * Element that receives focus when the trap activates if no other
     * focusable child is found. Defaults to the trap container itself
     * (must be `tabIndex={-1}` for that to work, or focus-trap will throw).
     */
    initialFocus?: HTMLElement | (() => HTMLElement) | false;
    /**
     * Allow click events on elements outside the trap. Default `true` —
     * the consumer (e.g. Modal) handles overlay click semantics itself.
     */
    allowOutsideClick?: boolean;
}
/**
 * Activate a focus trap on a ref'd container while `active` is true.
 *
 * **Stability note** — option fields are read into the effect's dep array.
 * If you pass a fresh function for `initialFocus` on every render (e.g.
 * inline arrow), the trap will re-activate each render. Memoize the
 * function with `useCallback` or pass primitives only.
 */
export declare function useFocusTrap<T extends HTMLElement>(ref: RefObject<T | null>, active: boolean, options?: UseFocusTrapOptions): void;
//# sourceMappingURL=useFocusTrap.d.ts.map