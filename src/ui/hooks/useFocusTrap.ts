import { useEffect, type RefObject } from "react";
import { createFocusTrap, type FocusTrap } from "focus-trap";

export interface UseFocusTrapOptions {
  /**
   * Element that receives focus when the trap activates. When omitted,
   * focus-trap uses its own default target selection; `fallbackFocus`
   * is still set to the trap container so empty dialogs remain valid.
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
export function useFocusTrap<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  options: UseFocusTrapOptions = {},
): void {
  const { initialFocus, allowOutsideClick } = options;
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    let trap: FocusTrap;
    try {
      trap = createFocusTrap(node, {
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        returnFocusOnDeactivate: true,
        allowOutsideClick: allowOutsideClick ?? true,
        initialFocus,
        fallbackFocus: node,
      });
      trap.activate();
    } catch (err) {
      // focus-trap throws when a container has no tabbable children and
      // `fallbackFocus` is not in the DOM tree. Silent failure would mask
      // genuine a11y regressions, so surface it. Keeping it as a warning
      // (not throw) preserves runtime resilience.
      // eslint-disable-next-line no-console
      console.warn("[lvis-plugin-sdk] focus-trap activation failed", err);
      return;
    }
    return () => {
      try {
        trap.deactivate();
      } catch {
        // already deactivated or node removed
      }
    };
  }, [active, ref, initialFocus, allowOutsideClick]);
}
