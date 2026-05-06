// Side-effect: inject `:root` fallback token values so `var(--lvis-*)`
// resolves to a sensible dark-mode palette during the brief window
// between plugin webview mount and the host's first `host.theme.changed`
// broadcast. Without this, components like Toggle render invisible
// (CSS `initial` for unknown variables) until the user toggles the
// theme. Must run before any component module's `injectTokenCss` so
// the `<style>` order stays predictable in <head>.
import "./tokens/fallback.js";

export * from "./components/index.js";
export * from "./hooks/useTheme.js";
export { useFocusTrap } from "./hooks/useFocusTrap.js";
export type { UseFocusTrapOptions } from "./hooks/useFocusTrap.js";
export * from "./tokens/index.js";
export { applyThemeTokens, injectTokenCss } from "./tokens/inject.js";
