// src/ui/components/Modal.tsx
import * as React from "react";

// src/ui/tokens/index.ts
var LVIS_TOKEN_NAMES = [
  "--lvis-bg",
  "--lvis-surface",
  "--lvis-surface-overlay",
  "--lvis-fg",
  "--lvis-fg-muted",
  "--lvis-fg-disabled",
  "--lvis-primary",
  "--lvis-primary-fg",
  "--lvis-secondary",
  "--lvis-secondary-fg",
  "--lvis-danger",
  "--lvis-danger-fg",
  "--lvis-warning",
  "--lvis-warning-fg",
  "--lvis-success",
  "--lvis-success-fg",
  "--lvis-border",
  "--lvis-ring",
  "--lvis-radius-xs",
  "--lvis-radius-sm",
  "--lvis-radius",
  "--lvis-radius-lg",
  "--lvis-radius-full",
  "--lvis-text-xs",
  "--lvis-text-sm",
  "--lvis-text-base",
  "--lvis-text-lg",
  "--lvis-weight-normal",
  "--lvis-weight-medium",
  "--lvis-weight-semibold",
  "--lvis-space-1",
  "--lvis-space-2",
  "--lvis-space-3",
  "--lvis-space-4",
  "--lvis-motion-fast",
  "--lvis-motion-normal"
];

// src/ui/tokens/inject.ts
var _ALLOWED_KEYS = new Set(LVIS_TOKEN_NAMES);
var _FALLBACK_CSS = `:root {
  --lvis-bg:           hsl(222.2, 84%, 4.9%);
  --lvis-surface:      hsl(222.2, 84%, 7%);
  --lvis-fg:           hsl(210, 40%, 98%);
  --lvis-fg-muted:     hsl(215, 20%, 65%);
  --lvis-primary:      hsl(217.2, 91.2%, 59.8%);
  --lvis-primary-fg:   hsl(210, 40%, 98%);
  --lvis-secondary:    hsl(217, 33%, 17%);
  --lvis-secondary-fg: hsl(210, 40%, 98%);
  --lvis-danger:       hsl(0, 62.8%, 30.6%);
  --lvis-danger-fg:    hsl(210, 40%, 98%);
  --lvis-warning:      hsl(48, 97%, 77%);
  --lvis-warning-fg:   hsl(30, 80%, 25%);
  --lvis-success:      hsl(142, 71%, 45%);
  --lvis-border:       hsl(217, 33%, 17%);
  --lvis-ring:         hsl(224.3, 76.3%, 48%);
  --lvis-radius:       0.6rem;
  --lvis-radius-sm:    0.25rem;
}`;
var _fallbackEnsured = false;
function ensureFallback() {
  if (_fallbackEnsured) return;
  if (typeof document === "undefined") return;
  _fallbackEnsured = true;
  if (document.getElementById("lvis-tokens-fallback")) return;
  const el = document.createElement("style");
  el.id = "lvis-tokens-fallback";
  el.textContent = _FALLBACK_CSS;
  document.head.appendChild(el);
}
function injectTokenCss(id, css) {
  ensureFallback();
  if (typeof document === "undefined") return;
  const existing = document.getElementById(id);
  if (existing) {
    if (existing.textContent !== css) existing.textContent = css;
    return;
  }
  const el = document.createElement("style");
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}

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

// src/ui/components/Modal.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var CSS = `
.lvis-modal-overlay {
  position: fixed; inset: 0;
  background: rgb(0 0 0 / 0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem; z-index: 1000;
  animation: lvis-modal-fade-in 0.15s ease-out;
}
.lvis-modal {
  background: var(--lvis-surface);
  color: var(--lvis-fg);
  border: 1px solid var(--lvis-border);
  border-radius: var(--lvis-radius);
  display: flex; flex-direction: column;
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  animation: lvis-modal-pop-in 0.18s ease-out;
}
.lvis-modal-sm { width: 360px; max-width: 100%; }
.lvis-modal-md { width: 520px; max-width: 100%; }
.lvis-modal-lg { width: 760px; max-width: 100%; }
.lvis-modal-head {
  padding: 1rem 1.25rem 0.5rem;
  display: flex; flex-direction: column; gap: 0.25rem;
}
.lvis-modal-title {
  font-size: 1.0625rem; font-weight: 600;
  margin: 0; color: var(--lvis-fg);
}
.lvis-modal-caption {
  font-size: 0.875rem; color: var(--lvis-fg-muted);
  margin: 0;
}
.lvis-modal-body {
  padding: 0.5rem 1.25rem 1rem;
  overflow-y: auto;
  flex: 1 1 auto;
  color: var(--lvis-fg);
}
.lvis-modal-foot {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--lvis-border);
  display: flex; gap: 0.5rem; justify-content: flex-end;
}
@keyframes lvis-modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes lvis-modal-pop-in {
  from { opacity: 0; transform: translateY(4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .lvis-modal-overlay, .lvis-modal { animation: none; }
}
`;
injectTokenCss("lvis-modal", CSS);
var _scrollLockCount = 0;
var _scrollLockOriginal = "";
var _modalDismissStack = [];
function handleModalKeydown(e) {
  if (e.key !== "Escape") return;
  const top = _modalDismissStack[_modalDismissStack.length - 1];
  if (top === void 0 || top.disableDismiss) return;
  top.onClose();
}
function Modal(props) {
  const {
    open,
    onClose,
    title,
    caption,
    children,
    footer,
    size = "md",
    disableDismiss = false,
    ariaLabel,
    testId
  } = props;
  const dialogRef = React.useRef(null);
  const reactId = React.useId();
  const titleId = `lvis-modal-title-${reactId}`;
  useFocusTrap(dialogRef, open);
  React.useEffect(() => {
    if (!open) return;
    const entry = {
      id: /* @__PURE__ */ Symbol("lvis-modal-dismiss"),
      onClose,
      disableDismiss
    };
    _modalDismissStack.push(entry);
    if (_modalDismissStack.length === 1) {
      document.addEventListener("keydown", handleModalKeydown);
    }
    return () => {
      const idx = _modalDismissStack.findIndex((item) => item.id === entry.id);
      if (idx !== -1) _modalDismissStack.splice(idx, 1);
      if (_modalDismissStack.length === 0) {
        document.removeEventListener("keydown", handleModalKeydown);
      }
    };
  }, [open, disableDismiss, onClose]);
  React.useEffect(() => {
    if (!open) return;
    if (_scrollLockCount === 0) {
      _scrollLockOriginal = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    _scrollLockCount++;
    return () => {
      _scrollLockCount--;
      if (_scrollLockCount === 0) {
        document.body.style.overflow = _scrollLockOriginal;
      }
    };
  }, [open]);
  if (!open) return null;
  const titleIsString = typeof title === "string" && title.trim().length > 0;
  const shouldRenderTitle = title !== void 0 && (typeof title !== "string" || title.trim().length > 0);
  const dialogLabel = titleIsString ? void 0 : ariaLabel ?? "Dialog";
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "lvis-modal-overlay",
      role: "presentation",
      "data-testid": testId,
      onClick: (e) => {
        if (disableDismiss) return;
        if (e.target === e.currentTarget) onClose();
      },
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          ref: dialogRef,
          className: `lvis-modal lvis-modal-${size}`,
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": titleIsString ? titleId : void 0,
          "aria-label": dialogLabel,
          tabIndex: -1,
          children: [
            (title !== void 0 || caption !== void 0) && /* @__PURE__ */ jsxs("div", { className: "lvis-modal-head", children: [
              shouldRenderTitle && (titleIsString ? /* @__PURE__ */ jsx("h2", { id: titleId, className: "lvis-modal-title", children: title }) : /* @__PURE__ */ jsx("div", { className: "lvis-modal-title", children: title })),
              caption !== void 0 && /* @__PURE__ */ jsx("p", { className: "lvis-modal-caption", children: caption })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "lvis-modal-body", children }),
            footer !== void 0 && /* @__PURE__ */ jsx("div", { className: "lvis-modal-foot", children: footer })
          ]
        }
      )
    }
  );
}
export {
  Modal
};
