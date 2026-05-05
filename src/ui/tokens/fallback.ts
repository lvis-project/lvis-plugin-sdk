import { injectTokenCss } from "./inject.js";

/**
 * `:root` fallback token values. Auto-injected at module load so
 * `var(--lvis-*)` references in component CSS resolve to a sensible
 * dark-mode palette during the brief window between webview mount and
 * the host's first `host.theme.changed` broadcast.
 *
 * Without this fallback, plugin UIs flash invisible (CSS `initial`)
 * because `var(--lvis-*)` has no defined value until the host pushes
 * computed tokens via the broadcast — observed as "Toggle thumb is
 * white on white" until the user toggles the theme.
 *
 * Values mirror `lvis-tokens.css :root` and stay in lockstep with
 * `lvis-app/src/ui/renderer/theme/plugin-token-map.ts _DARK_BASE`.
 * Three places need to move together when the design palette shifts:
 *   1. lvis-app/src/ui/renderer/theme/plugin-token-map.ts (_DARK_BASE)
 *   2. lvis-plugin-sdk/src/ui/tokens/lvis-tokens.css (:root)
 *   3. lvis-plugin-sdk/src/ui/tokens/fallback.ts (this file)
 */
const FALLBACK_CSS = `:root {
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

injectTokenCss("lvis-tokens-fallback", FALLBACK_CSS);
