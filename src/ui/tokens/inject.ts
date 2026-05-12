import { LVIS_TOKEN_NAMES, LVIS_THEME_BUNDLE_IDS, type LvisHostThemeEvent } from "./index.js";
import { _FALLBACK_CSS } from "./_generated-fallback-css.js";

const _ALLOWED_KEYS = new Set<string>(LVIS_TOKEN_NAMES);
// Block CSS exfil / injection patterns. Use /<[a-zA-Z]/ for HTML tags
// rather than bare `<` to avoid false-positives on CSS math expressions.
const _UNSAFE_VALUE = /url\s*\(|expression\s*\(|<[a-zA-Z]/i;

// `_FALLBACK_CSS` (the `:root` block applied before the host's first
// `host.theme.changed` broadcast) is generated from
// `src/ui/tokens/fallback-dark.json` by `scripts/generate-fallback-artifacts.mjs`.
// The same JSON regenerates `lvis-tokens.css :root`, and the host's
// `lvis-app/src/ui/renderer/theme/plugin-token-map.ts` `_DARK_BASE`
// re-imports the JSON directly — so all three artifacts move in lockstep
// from a single SoT. Run `bun run generate:fallback` after editing the JSON
// and `bun run check:fallback-drift` enforces it in CI.

const _fallbackEnsured = new WeakSet<Document>();

function resolveDoc(target?: Document | HTMLElement): Document | null {
  if (target === undefined) return typeof document === "undefined" ? null : document;
  if ("ownerDocument" in target) return target.ownerDocument;
  return target;
}

function resolveElement(target?: Document | HTMLElement): HTMLElement | null {
  if (target === undefined) {
    return typeof document === "undefined" ? null : document.documentElement;
  }
  if (target instanceof HTMLElement) return target;
  return target.documentElement;
}

export function ensureFallback(targetDoc?: Document): void {
  const doc = targetDoc ?? (typeof document === "undefined" ? null : document);
  if (!doc) return;
  if (_fallbackEnsured.has(doc)) return;
  // Flip the gate BEFORE the DOM mutation: fallback inject is best-effort.
  // If `appendChild` throws (e.g. CSP `style-src` violation, frozen <head>),
  // re-trying every subsequent injectTokenCss call would just rethrow the
  // same error indefinitely — the host's primary `host.theme.changed`
  // broadcast still wins via inline `style.setProperty` regardless.
  _fallbackEnsured.add(doc);
  if (doc.getElementById("lvis-tokens-fallback")) return;
  const el = doc.createElement("style");
  el.id = "lvis-tokens-fallback";
  el.textContent = _FALLBACK_CSS;
  doc.head.appendChild(el);
}

export function injectTokenCss(id: string, css: string, targetDoc?: Document): void {
  const doc = targetDoc ?? (typeof document === "undefined" ? null : document);
  if (!doc) return;
  ensureFallback(doc);
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
  target?: Document | HTMLElement,
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
  target?: Document | HTMLElement,
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

// Internal re-export for hooks (primeTheme) — keeps the doc-resolve logic
// in one module rather than duplicating it in the React hook.
export { resolveDoc as _resolveDoc };
