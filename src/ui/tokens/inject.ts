import { LVIS_TOKEN_NAMES } from "./index.js";

const _injected = new Set<string>();
const _ALLOWED_KEYS = new Set<string>(LVIS_TOKEN_NAMES);
// Block CSS exfil / injection patterns in token values
const _UNSAFE_VALUE = /url\s*\(|expression\s*\(|</i;

export function injectTokenCss(id: string, css: string): void {
  if (typeof document === "undefined") return;
  // Replace content on HMR re-render so style changes are visible in dev.
  const existing = document.getElementById(id);
  if (existing) {
    if (existing.textContent !== css) existing.textContent = css;
    return;
  }
  if (_injected.has(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
  _injected.add(id);
}

export function applyThemeTokens(tokens: Record<string, string>): void {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) {
    if (!_ALLOWED_KEYS.has(k)) continue;
    if (_UNSAFE_VALUE.test(v)) continue;
    root.style.setProperty(k, v);
  }
}
