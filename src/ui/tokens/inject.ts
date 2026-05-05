import { LVIS_TOKEN_NAMES } from "./index.js";

const _ALLOWED_KEYS = new Set<string>(LVIS_TOKEN_NAMES);
// Block CSS exfil / injection patterns. Use /<[a-zA-Z]/ for HTML tags
// rather than bare `<` to avoid false-positives on CSS math expressions.
const _UNSAFE_VALUE = /url\s*\(|expression\s*\(|<[a-zA-Z]/i;

// `:root` fallback values — kept inline here (instead of a separate
// `fallback.ts` module) so the SINGLE entry point that every component
// imports — `injectTokenCss` — can lazily ensure the fallback `<style>`
// is present on first call. The prior pattern of having every component
// file add `import "../tokens/fallback.js"` worked but smelled — 10
// identical lines future contributors had to remember when authoring a
// new component. With ensure-on-inject, the requirement collapses to
// "use injectTokenCss," which is already universal.
//
// Values mirror `lvis-tokens.css :root` and lockstep with the host's
// `_DARK_BASE` token map. Three places must move together when the
// design palette shifts:
//   1. lvis-app/src/ui/renderer/theme/plugin-token-map.ts (_DARK_BASE)
//   2. lvis-plugin-sdk/src/ui/tokens/lvis-tokens.css (:root)
//   3. lvis-plugin-sdk/src/ui/tokens/inject.ts (this file, _FALLBACK_CSS)
const _FALLBACK_CSS = `:root {
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

let _fallbackEnsured = false;
export function ensureFallback(): void {
  if (_fallbackEnsured) return;
  if (typeof document === "undefined") return;
  // Flip the gate BEFORE the DOM mutation: fallback inject is best-effort.
  // If `appendChild` throws (e.g. CSP `style-src` violation, frozen <head>),
  // re-trying every subsequent injectTokenCss call would just rethrow the
  // same error indefinitely — the host's primary `host.theme.changed`
  // broadcast still wins via inline `style.setProperty` regardless.
  _fallbackEnsured = true;
  if (document.getElementById("lvis-tokens-fallback")) return;
  const el = document.createElement("style");
  el.id = "lvis-tokens-fallback";
  el.textContent = _FALLBACK_CSS;
  document.head.appendChild(el);
}

export function injectTokenCss(id: string, css: string): void {
  ensureFallback();
  if (typeof document === "undefined") return;
  // Check DOM directly (not a Set) so HMR re-renders pick up CSS changes.
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

export function applyThemeTokens(tokens: Record<string, string>): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) {
    if (!_ALLOWED_KEYS.has(k)) continue;
    if (_UNSAFE_VALUE.test(v)) continue;
    root.style.setProperty(k, v);
  }
}
