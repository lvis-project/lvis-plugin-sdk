import * as React from "react";
import { injectTokenCss } from "../tokens/inject.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";

const CSS = `
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
  /** Fallback aria-label when title is not a plain string. */
  ariaLabel?: string;
  /** data-testid on the overlay element. */
  testId?: string;
}

// Module-level scroll-lock reference counter — handles nested Modals
// correctly. Without this, an outer Modal that closes while an inner is
// still open would restore body overflow to its pre-outer value, breaking
// the inner's scroll lock. See `Modal.test.tsx` "nested Modal scroll lock".
let _scrollLockCount = 0;
let _scrollLockOriginal = "";

export function Modal(props: ModalProps): React.ReactElement | null {
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
    testId,
  } = props;

  const dialogRef = React.useRef<HTMLDivElement>(null);
  // React.useId() yields colon-delimited ids (e.g. `:r2:`) that are valid
  // HTML id attributes and aria-labelledby targets, but invalid in CSS
  // selectors — use `document.getElementById(titleId)`, never `querySelector`.
  const reactId = React.useId();
  const titleId = `lvis-modal-title-${reactId}`;

  useFocusTrap(dialogRef, open);

  React.useEffect(() => {
    if (!open || disableDismiss) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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

  const titleIsString = typeof title === "string";

  return (
    <div
      className="lvis-modal-overlay"
      role="presentation"
      data-testid={testId}
      onClick={(e) => {
        if (disableDismiss) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`lvis-modal lvis-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleIsString ? titleId : undefined}
        aria-label={!titleIsString ? ariaLabel : undefined}
        tabIndex={-1}
      >
        {(title !== undefined || caption !== undefined) && (
          <div className="lvis-modal-head">
            {title !== undefined &&
              (titleIsString ? (
                <h2 id={titleId} className="lvis-modal-title">
                  {title}
                </h2>
              ) : (
                <div className="lvis-modal-title">{title}</div>
              ))}
            {caption !== undefined && <p className="lvis-modal-caption">{caption}</p>}
          </div>
        )}
        <div className="lvis-modal-body">{children}</div>
        {footer !== undefined && <div className="lvis-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
