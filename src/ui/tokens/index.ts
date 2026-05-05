// SDK가 토큰 이름/타입의 유일한 SoT. 호스트는 이 파일을 import한다.
// 외부 sync 스크립트 없음 — TypeScript 컴파일러가 드리프트를 차단한다.
export const LVIS_TOKEN_NAMES = [
  // ── Color ─────────────────────────────────────────
  "--lvis-bg",
  "--lvis-surface",
  "--lvis-surface-overlay",   // modal/dropdown overlay bg
  "--lvis-fg",
  "--lvis-fg-muted",
  "--lvis-fg-disabled",       // disabled state text
  "--lvis-primary",
  "--lvis-primary-fg",
  "--lvis-secondary",
  "--lvis-secondary-fg",
  "--lvis-danger",
  "--lvis-danger-fg",
  "--lvis-warning",
  "--lvis-warning-fg",
  "--lvis-success",
  "--lvis-success-fg",        // text on success bg
  "--lvis-border",
  "--lvis-ring",
  // ── Shape ─────────────────────────────────────────
  "--lvis-radius-xs",         // 0.15rem
  "--lvis-radius-sm",
  "--lvis-radius",
  "--lvis-radius-lg",         // 0.75rem
  "--lvis-radius-full",       // 9999px
  // ── Typography ────────────────────────────────────
  "--lvis-text-xs",           // 0.75rem
  "--lvis-text-sm",           // 0.875rem
  "--lvis-text-base",         // 1rem
  "--lvis-text-lg",           // 1.125rem
  "--lvis-weight-normal",     // 400
  "--lvis-weight-medium",     // 500
  "--lvis-weight-semibold",   // 600
  // ── Spacing ───────────────────────────────────────
  "--lvis-space-1",           // 0.25rem
  "--lvis-space-2",           // 0.5rem
  "--lvis-space-3",           // 0.75rem
  "--lvis-space-4",           // 1rem
  // ── Motion ────────────────────────────────────────
  "--lvis-motion-fast",       // 150ms
  "--lvis-motion-normal",     // 200ms
] as const;

export type LvisTokenName = typeof LVIS_TOKEN_NAMES[number];

// Non-partial mapped type: all 36 tokens required.
// Host must provide all keys — TypeScript enforces this at compile time.
export type LvisTokenMap = { readonly [K in LvisTokenName]: string };

/** @deprecated Use LvisTokenMap instead. */
export type LvisThemeTokens = LvisTokenMap;

/**
 * CSS-only static tokens — defined in lvis-tokens.css as offline fallbacks
 * but NOT included in LVIS_TOKEN_NAMES and NOT sent over IPC. Their value
 * syntax (box-shadow, cubic-bezier) cannot pass the host's IPC safety regex.
 * Plugin components may use `var(--lvis-shadow-sm)` etc. in their CSS.
 */
export const LVIS_CSS_ONLY_TOKEN_NAMES = [
  "--lvis-shadow-sm",
  "--lvis-shadow-md",
  "--lvis-easing",
] as const;

export type LvisCssOnlyTokenName = typeof LVIS_CSS_ONLY_TOKEN_NAMES[number];

/**
 * v2 bridge payload.
 * - `tokens` is required and non-partial: hosts that miss a token get a tsc error.
 * - New fields (`colorScheme`, `reducedMotion`, `fonts`) are optional so existing
 *   plugin builds compiled against v3 still receive the payload without errors.
 */
export interface LvisThemePayload {
  v?: 2;
  theme: "light" | "dark" | "high-contrast";
  chatTheme: "default" | "lg" | "purple" | "orange" | "blue";
  codeTheme: "light" | "dark";
  colorScheme?: "light" | "dark";
  reducedMotion?: boolean;
  fonts?: { family: string };
  tokens: LvisTokenMap;
}
