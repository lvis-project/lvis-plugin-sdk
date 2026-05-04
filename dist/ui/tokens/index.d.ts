export declare const LVIS_TOKEN_NAMES: readonly ["--lvis-bg", "--lvis-surface", "--lvis-fg", "--lvis-fg-muted", "--lvis-primary", "--lvis-primary-fg", "--lvis-secondary", "--lvis-secondary-fg", "--lvis-danger", "--lvis-danger-fg", "--lvis-warning", "--lvis-warning-fg", "--lvis-success", "--lvis-border", "--lvis-ring", "--lvis-radius", "--lvis-radius-sm"];
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
//# sourceMappingURL=index.d.ts.map