import { type RefObject } from "react";
export interface UseFocusTrapOptions {
    /**
     * Element that receives focus when the trap activates. When omitted,
     * focus-trap uses its own default target selection; `fallbackFocus`
     * is still set to the trap container so empty dialogs remain valid.
     * The container must therefore be programmatically focusable (for
     * example `tabIndex={-1}`). Passing `false` disables initial focus.
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