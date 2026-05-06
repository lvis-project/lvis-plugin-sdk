// src/ui/hooks/useFocusTrap.ts
import { useEffect } from "react";
import { createFocusTrap } from "focus-trap";
function useFocusTrap(ref, active, options = {}) {
  const { initialFocus, allowOutsideClick } = options;
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    let trap;
    try {
      trap = createFocusTrap(node, {
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        returnFocusOnDeactivate: true,
        allowOutsideClick: allowOutsideClick ?? true,
        initialFocus,
        fallbackFocus: node
      });
      trap.activate();
    } catch (err) {
      console.warn("[lvis-plugin-sdk] focus-trap activation failed", err);
      return;
    }
    return () => {
      try {
        trap.deactivate();
      } catch {
      }
    };
  }, [active, ref, initialFocus, allowOutsideClick]);
}
export {
  useFocusTrap
};
