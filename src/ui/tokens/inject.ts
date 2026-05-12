import { LVIS_TOKEN_NAMES, LVIS_THEME_BUNDLE_IDS, type LvisHostThemeEvent } from "./index.js";

const _ALLOWED_KEYS = new Set<string>(LVIS_TOKEN_NAMES);
// Block CSS exfil / injection patterns. Use /<[a-zA-Z]/ for HTML tags
// rather than bare `<` to avoid false-positives on CSS math expressions.
const _UNSAFE_VALUE = /url\s*\(|expression\s*\(|<[a-zA-Z]/i;

// Cross-realm safe element / document detection.
// `target instanceof HTMLElement` fails when `target` comes from a different
// realm (e.g. detached BrowserWindow's document — its HTMLElement constructor
// is a different identity than the calling renderer's). Falling back on
// `nodeType` + presence of `ownerDocument` is realm-agnostic and matches the
// minimal DOM contract these helpers actually use (`style.setProperty`,
// `setAttribute`, `appendChild`, `createElement`, `getElementById`).
const _DOC_NODE = 9;
const _ELEMENT_NODE = 1;

function isDocument(value: unknown): value is Document {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { nodeType?: number }).nodeType === _DOC_NODE
  );
}

function isHtmlElement(value: unknown): value is HTMLElement {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { nodeType?: number }).nodeType === _ELEMENT_NODE &&
    typeof (value as { ownerDocument?: Document | null }).ownerDocument !== "undefined"
  );
}

function resolveDoc(target?: Document | HTMLElement | null): Document | null {
  if (target == null) return typeof document === "undefined" ? null : document;
  if (isDocument(target)) return target;
  if (isHtmlElement(target)) return target.ownerDocument;
  return null;
}

function resolveElement(target?: Document | HTMLElement | null): HTMLElement | null {
  if (target == null) {
    return typeof document === "undefined" ? null : document.documentElement;
  }
  if (isHtmlElement(target)) return target;
  if (isDocument(target)) return target.documentElement;
  return null;
}

export function injectTokenCss(id: string, css: string, targetDoc?: Document | null): void {
  const doc = targetDoc ?? (typeof document === "undefined" ? null : document);
  if (!doc) return;
  // Check DOM directly (not a Set) so HMR re-renders pick up CSS changes.
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

/**
 * Apply token CSS custom properties to `target`.
 *
 * - `target` defaults to `document.documentElement`. Pass a `Document` (e.g.
 *   the document of a detached `BrowserWindow`) to target that window's
 *   documentElement, or pass a specific `HTMLElement` to scope the tokens
 *   to a sub-tree (useful for sidebar mounts that don't own
 *   documentElement).
 * - Tokens not in `LVIS_TOKEN_NAMES` are silently dropped (closed allowlist).
 * - Values matching the unsafe-CSS regex (`url(`, `expression(`, HTML tag
 *   prefix) are silently dropped.
 */
export function applyThemeTokens(
  tokens: Record<string, string>,
  target?: Document | HTMLElement | null,
): void {
  const root = resolveElement(target);
  if (!root) return;
  for (const [k, v] of Object.entries(tokens)) {
    if (!_ALLOWED_KEYS.has(k)) continue;
    if (_UNSAFE_VALUE.test(v)) continue;
    root.style.setProperty(k, v);
  }
}

/**
 * Apply a `LvisHostThemeEvent` (or `null`) to `target`.
 *
 * Convenience helper that removes per-plugin boilerplate for the common
 * DOM-update pattern:
 * - Sets `data-theme-bundle` and `data-shell` attributes on `target` (or
 *   the resolved documentElement when a `Document` is passed), or removes
 *   them when the event is `null` (theme reset).
 * - Validates `bundleId` against {@link LVIS_THEME_BUNDLE_IDS} before
 *   writing the attribute (no stale/unknown bundle id leaks into the DOM).
 * - Validates `shell` to `"light" | "dark"` before writing.
 * - Applies all token values via {@link applyThemeTokens} (closed allowlist
 *   + unsafe-value guard are enforced there).
 *
 * Plugins that use `useTheme` or `primeTheme` directly do NOT need to call
 * this helper — those wrappers already perform the same logic internally.
 * This is intended for vanilla-JS plugins or custom React shells that
 * manage the bridge event subscription themselves.
 *
 * @param event - Parsed `LvisHostThemeEvent`, or `null` to clear theme attrs.
 * @param target - Optional target. Defaults to `document.documentElement`.
 */
export function applyThemeFromHostEvent(
  event: LvisHostThemeEvent | null,
  target?: Document | HTMLElement | null,
): void {
  const root = resolveElement(target);
  if (!root) return;
  if (!event) {
    root.removeAttribute("data-theme-bundle");
    root.removeAttribute("data-shell");
    for (const tokenName of LVIS_TOKEN_NAMES) {
      root.style.removeProperty(tokenName);
    }
    return;
  }
  if ((LVIS_THEME_BUNDLE_IDS as ReadonlyArray<string>).includes(event.bundleId)) {
    root.setAttribute("data-theme-bundle", event.bundleId);
  } else {
    root.removeAttribute("data-theme-bundle");
  }
  if (event.shell === "light" || event.shell === "dark") {
    root.setAttribute("data-shell", event.shell);
  } else {
    root.removeAttribute("data-shell");
  }
  if (event.tokens !== null && typeof event.tokens === "object" && !Array.isArray(event.tokens)) {
    applyThemeTokens(event.tokens as Record<string, string>, target);
  }
}

