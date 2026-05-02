export const LVIS_TOKEN_NAMES = [
  "--lvis-bg", "--lvis-surface", "--lvis-fg", "--lvis-fg-muted",
  "--lvis-primary", "--lvis-primary-fg", "--lvis-secondary", "--lvis-secondary-fg",
  "--lvis-danger", "--lvis-danger-fg", "--lvis-warning", "--lvis-warning-fg",
  "--lvis-success", "--lvis-border", "--lvis-ring", "--lvis-radius", "--lvis-radius-sm",
] as const;

export type LvisTokenName = typeof LVIS_TOKEN_NAMES[number];

export type LvisThemeTokens = {
  [K in LvisTokenName]: string;
};

export type LvisThemePayload = {
  theme: "light" | "dark" | "high-contrast";
  chatTheme: "default" | "purple" | "orange" | "blue";
  codeTheme: "auto" | "light" | "dark";
  tokens: LvisThemeTokens;
};
