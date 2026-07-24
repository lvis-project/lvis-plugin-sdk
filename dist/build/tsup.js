// src/build/tsup.ts
var HOST_EXTERNAL_MODULES = ["electron"];
var HOST_BROWSER_EXTERNAL_MODULES = ["react", "react-dom"];
var BUNDLE_EVERYTHING_REGEX = new RegExp(".*");
function defineLvisPluginConfig(overrides = {}) {
  if (Array.isArray(overrides)) {
    return overrides.map(applyDefaults);
  }
  return applyDefaults(overrides);
}
function isBrowserBuild(override) {
  if (override.platform === "browser") return true;
  if (override.platform === "node") return false;
  const targets = typeof override.target === "string" ? [override.target] : Array.isArray(override.target) ? override.target : [];
  return targets.some((t) => looksLikeBrowserTarget(t));
}
function looksLikeBrowserTarget(target) {
  if (typeof target !== "string") return false;
  const lower = target.toLowerCase();
  return lower.startsWith("chrome") || lower.startsWith("firefox") || lower.startsWith("safari") || lower.startsWith("edge");
}
function applyDefaults(override) {
  const isBrowser = isBrowserBuild(override);
  const hostExternals = isBrowser ? [...HOST_EXTERNAL_MODULES, ...HOST_BROWSER_EXTERNAL_MODULES] : [...HOST_EXTERNAL_MODULES];
  const baseDefaults = {
    // The marketplace contract entry is `src/hostPlugin.ts` — `plugin.json`
    // points at `dist/hostPlugin.js`. Plugins that ALSO ship a separate
    // `src/index.ts` (e.g., for npm-package consumption) should override
    // `entry` explicitly: `entry: ["src/index.ts", "src/hostPlugin.ts"]`.
    entry: ["src/hostPlugin.ts"],
    format: ["esm"],
    target: "node20",
    clean: true,
    sourcemap: true,
    splitting: false,
    dts: false,
    outDir: "dist"
  };
  const userExternals = Array.isArray(override.external) ? override.external : [];
  const cjsInteropJs = 'import { createRequire as __lvisCreateRequire } from "module";import { fileURLToPath as __lvisFileURLToPath } from "url";import { dirname as __lvisDirname } from "path";var require = __lvisCreateRequire(import.meta.url);var __filename = __lvisFileURLToPath(import.meta.url);var __dirname = __lvisDirname(__filename);';
  const userBanner = override.banner;
  const mergeWithCjsInterop = (user) => ({
    ...user,
    js: cjsInteropJs + (user?.js ?? "")
  });
  const mergedBanner = isBrowser ? userBanner : typeof userBanner === "function" ? (ctx) => mergeWithCjsInterop(userBanner(ctx) || void 0) : mergeWithCjsInterop(userBanner);
  return {
    ...baseDefaults,
    ...override,
    external: dedupeExternals([...hostExternals, ...userExternals]),
    // noExternal is contract-locked: the helper exists to enforce
    // self-containment. User overrides for noExternal are intentionally
    // ignored.
    noExternal: [BUNDLE_EVERYTHING_REGEX],
    // banner is also contract-locked on Node builds: dropping the
    // CJS-interop js would re-break dynamic require. We merge instead of
    // overwrite so legitimate banner overrides (css, extra js prologue)
    // still work.
    banner: mergedBanner
  };
}
function dedupeExternals(items) {
  const seenStrings = /* @__PURE__ */ new Set();
  const seenRegexSources = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of items) {
    if (typeof item === "string") {
      if (seenStrings.has(item)) continue;
      seenStrings.add(item);
    } else if (item instanceof RegExp) {
      const key = `${item.source}/${item.flags}`;
      if (seenRegexSources.has(key)) continue;
      seenRegexSources.add(key);
    }
    out.push(item);
  }
  return out;
}
export {
  BUNDLE_EVERYTHING_REGEX,
  HOST_BROWSER_EXTERNAL_MODULES,
  HOST_EXTERNAL_MODULES,
  defineLvisPluginConfig
};
