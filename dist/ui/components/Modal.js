// src/ui/components/Modal.tsx
import * as React from "react";

// src/ui/tokens/theme-bundles.ts
var BUNDLE_IDS = [
  "tokyo-night",
  "midnight",
  "forest",
  "lge-light",
  "lge-dark",
  "high-contrast",
  "catppuccin-mocha",
  "catppuccin-latte",
  "nord",
  "gruvbox-dark-hard",
  "solarized-light",
  "rose-pine",
  "cherry-blossom"
];

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
var LVIS_THEME_BUNDLE_IDS = Object.freeze([...BUNDLE_IDS]);

// src/ui/tokens/inject.ts
var _ALLOWED_KEYS = new Set(LVIS_TOKEN_NAMES);
function injectTokenCss(id, css, targetDoc) {
  const doc = targetDoc ?? (typeof document === "undefined" ? null : document);
  if (!doc) return;
  const existing = doc.getElementById(id);
  if (existing) {
    if (existing.textContent !== css) existing.textContent = css;
    return;
  }
  const el = doc.createElement("style");
  el.id = id;
  el.textContent = css;
  doc.head.appendChild(el);
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
  const titleAsAccessibleLabel = typeof title === "string" ? title.trim().length > 0 ? title : void 0 : typeof title === "number" ? String(title) : void 0;
  const shouldRenderTitle = title !== void 0 && title !== null && title !== false && (typeof title !== "string" || title.trim().length > 0);
  const captionPresent = caption !== void 0 && caption !== null && caption !== false;
  const shouldRenderHeader = shouldRenderTitle || captionPresent;
  const titleHasAccessibleName = titleAsAccessibleLabel !== void 0;
  const ariaLabelHasContent = typeof ariaLabel === "string" && ariaLabel.trim().length > 0;
  const dialogLabel = titleHasAccessibleName ? void 0 : ariaLabelHasContent ? ariaLabel : "Dialog";
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
          "aria-labelledby": titleHasAccessibleName ? titleId : void 0,
          "aria-label": dialogLabel,
          tabIndex: -1,
          children: [
            shouldRenderHeader && /* @__PURE__ */ jsxs("div", { className: "lvis-modal-head", children: [
              shouldRenderTitle && (titleHasAccessibleName ? /* @__PURE__ */ jsx("h2", { id: titleId, className: "lvis-modal-title", children: title }) : /* @__PURE__ */ jsx("div", { className: "lvis-modal-title", children: title })),
              captionPresent && /* @__PURE__ */ jsx("p", { className: "lvis-modal-caption", children: caption })
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
