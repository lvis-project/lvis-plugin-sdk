// AUTO-GENERATED — DO NOT EDIT. Regenerate via: bun run sync:from-host
//
// Mirrored from lvis-app/src/shared/theme-bundles.ts



export const BUNDLE_IDS = Object.freeze([
  "moonstone",
  "gallery",
  "cherry-blossom",
  "tokyo-night",
  "midnight",
  "forest",
  "violet-light",
  "violet-dark",
  "high-contrast",
  "catppuccin-mocha",
  "catppuccin-latte",
  "nord",
  "gruvbox-dark-hard",
  "solarized-light",
  "rose-pine",
  "executive-graphite",
] as const);

export type BundleId = (typeof BUNDLE_IDS)[number];

const BUNDLE_ID_SET = new Set<string>(BUNDLE_IDS);

export function isBundleId(value: unknown): value is BundleId {
  return typeof value === "string" && BUNDLE_ID_SET.has(value);
}

export const DEFAULT_BUNDLE_ID: BundleId = "moonstone";

/**
 * Themes shown in the default in-app appearance picker while older/community
 * themes move toward marketplace packages. The full `BUNDLE_IDS` union remains
 * broad for settings migration, plugin theme events, and backward-compatible
 * validation during the marketplace migration.
 */
export const DEFAULT_VISIBLE_THEME_BUNDLE_IDS = Object.freeze([
  "moonstone",
  "gallery",
] as const satisfies readonly BundleId[]);

export type DefaultVisibleThemeBundleId =
  (typeof DEFAULT_VISIBLE_THEME_BUNDLE_IDS)[number];

const DEFAULT_VISIBLE_THEME_BUNDLE_ID_SET = new Set<string>(
  DEFAULT_VISIBLE_THEME_BUNDLE_IDS,
);

export type MarketplaceEligibleThemeBundleId =
  Exclude<BundleId, DefaultVisibleThemeBundleId>;

export const MARKETPLACE_ELIGIBLE_THEME_BUNDLE_IDS = Object.freeze(
  BUNDLE_IDS.filter(
    (bundleId): bundleId is MarketplaceEligibleThemeBundleId =>
      !DEFAULT_VISIBLE_THEME_BUNDLE_ID_SET.has(bundleId),
  ),
);

const MARKETPLACE_ELIGIBLE_THEME_BUNDLE_ID_SET = new Set<string>(
  MARKETPLACE_ELIGIBLE_THEME_BUNDLE_IDS,
);

export function isDefaultVisibleThemeBundleId(
  bundleId: unknown,
): bundleId is DefaultVisibleThemeBundleId {
  return (
    typeof bundleId === "string" &&
    DEFAULT_VISIBLE_THEME_BUNDLE_ID_SET.has(bundleId)
  );
}

export function isMarketplaceEligibleThemeBundleId(
  bundleId: unknown,
): bundleId is MarketplaceEligibleThemeBundleId {
  return (
    typeof bundleId === "string" &&
    MARKETPLACE_ELIGIBLE_THEME_BUNDLE_ID_SET.has(bundleId)
  );
}
