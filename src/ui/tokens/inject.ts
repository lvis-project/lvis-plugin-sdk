const _injected = new Set<string>();

export function injectTokenCss(id: string, css: string): void {
  if (typeof document === "undefined" || _injected.has(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
  _injected.add(id);
}

export function applyThemeTokens(tokens: Record<string, string>): void {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) {
    root.style.setProperty(k, v);
  }
}
