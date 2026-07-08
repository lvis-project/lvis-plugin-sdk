export declare const BUNDLE_IDS: readonly ["moonstone", "gallery", "cherry-blossom", "tokyo-night", "midnight", "forest", "violet-light", "violet-dark", "high-contrast", "catppuccin-mocha", "catppuccin-latte", "nord", "gruvbox-dark-hard", "solarized-light", "rose-pine", "executive-graphite"];
export type BundleId = (typeof BUNDLE_IDS)[number];
export declare function isBundleId(value: unknown): value is BundleId;
export declare const DEFAULT_BUNDLE_ID: BundleId;
/**
 * Themes shown in the default in-app appearance picker while older/community
 * themes move toward marketplace packages. The full `BUNDLE_IDS` union remains
 * broad for settings migration, plugin theme events, and backward-compatible
 * validation during the marketplace migration.
 */
export declare const DEFAULT_VISIBLE_THEME_BUNDLE_IDS: readonly ["moonstone", "gallery"];
export type DefaultVisibleThemeBundleId = (typeof DEFAULT_VISIBLE_THEME_BUNDLE_IDS)[number];
export type MarketplaceEligibleThemeBundleId = Exclude<BundleId, DefaultVisibleThemeBundleId>;
export declare const MARKETPLACE_ELIGIBLE_THEME_BUNDLE_IDS: readonly MarketplaceEligibleThemeBundleId[];
export declare function isDefaultVisibleThemeBundleId(bundleId: unknown): bundleId is DefaultVisibleThemeBundleId;
export declare function isMarketplaceEligibleThemeBundleId(bundleId: unknown): bundleId is MarketplaceEligibleThemeBundleId;
//# sourceMappingURL=theme-bundles.d.ts.map