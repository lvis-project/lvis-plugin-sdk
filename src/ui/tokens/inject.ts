import { LVIS_TOKEN_NAMES } from "./index.js";

const _ALLOWED_KEYS = new Set<string>(LVIS_TOKEN_NAMES);
// Block CSS exfil / injection patterns. Use /<[a-zA-Z]/ for HTML tags
// rather than bare `<` to avoid false-positives on CSS math expressions.
const _UNSAFE_VALUE = /url\s*\(|expression\s*\(|<[a-zA-Z]/i;

export function injectTokenCss(id: string, css: string): void {
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
