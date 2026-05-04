// <SOT-TOKENS-BEGIN>
// Synced from host `PLUGIN_TOKEN_NAMES` by scripts/sync-tokens-from-host.mjs.
// Do not edit manually — `bun run sync:tokens-from-host` regenerates this block.
export const LVIS_TOKEN_NAMES = [
  "--lvis-bg",
  "--lvis-surface",
  "--lvis-fg",
  "--lvis-fg-muted",
  "--lvis-primary",
  "--lvis-primary-fg",
  "--lvis-secondary",
  "--lvis-secondary-fg",
  "--lvis-danger",
  "--lvis-danger-fg",
  "--lvis-warning",
  "--lvis-warning-fg",
  "--lvis-success",
  "--lvis-border",
  "--lvis-ring",
  "--lvis-radius",
  "--lvis-radius-sm",
] as const;
// <SOT-TOKENS-END>

export type LvisTokenName = typeof LVIS_TOKEN_NAMES[number];

export type LvisThemeTokens = {
  [K in LvisTokenName]: string;
};

export type LvisThemePayload = {
  theme: "light" | "dark" | "high-contrast";
  chatTheme: "default" | "lg" | "purple" | "orange" | "blue";
  codeTheme: "light" | "dark";
  /** Optional explicit token values. When absent, :root fallback values in lvis-tokens.css apply until host broadcasts via host.theme.changed. */
  tokens?: Partial<LvisThemeTokens>;
};
