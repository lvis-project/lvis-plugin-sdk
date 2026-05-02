import type { Options } from "tsup";

/**
 * Modules treated as external by the LVIS host runtime.
 *
 * Marketplace plugins MUST NOT bundle these — they are provided by the
 * host process at plugin-load time. Bundling them would create duplicate
 * runtime instances (e.g., two `electron` contexts) and break IPC.
 *
 * This list is the SDK ↔ host contract. When the host adds a new
 * injected module, SDK MAJOR is bumped and this list is updated; plugins
 * pinned to an older SDK version continue using the older contract,
 * which means the new module gets bundled redundantly — harmless, just a
 * larger zip.
 */
export const HOST_EXTERNAL_MODULES = ["electron"] as const;

/**
 * Additional modules treated as external for browser-target plugin
 * bundles (UI panels rendered inside the host renderer process).
 *
 * `react` / `react-dom` MUST come from the host's React context — if a
 * plugin's UI bundle ships its own copy, you get two React instances and
 * the React context API silently fails (provider/consumer mismatch).
 */
export const HOST_BROWSER_EXTERNAL_MODULES = ["react", "react-dom"] as const;

/**
 * Build a tsup configuration for an LVIS marketplace plugin.
 *
 * ## Self-contained plugin contract
 *
 * LVIS marketplace plugins are distributed as zip archives that contain
 * ONLY `dist/` and `plugin.json`. The publish workflow excludes
 * `node_modules/` from the zip, and the host plugin loader uses strict
 * `pluginRoot` containment (no sibling-repo escape since 2026-05). So
 * plugins cannot fall back to the host's `node_modules/` at runtime.
 *
 * Therefore: every runtime dependency MUST be bundled into `dist/`.
 *
 * This helper enforces the contract via:
 * - `external: HOST_EXTERNAL_MODULES` (and `HOST_BROWSER_EXTERNAL_MODULES`
 *   when `platform === "browser"`) — host-provided modules stay external.
 * - `noExternal: [match-everything regex]` — every other import (deps,
 *   devDeps, transitive) gets bundled into `dist/`.
 *
 * ## Defaults
 *
 * - `entry`: `["src/index.ts", "src/hostPlugin.ts"]`
 * - `format`: `["esm"]`
 * - `target`: `"node20"`
 * - `clean`: `true`
 * - `sourcemap`: `true`
 * - `splitting`: `false`
 * - `dts`: `false` (use `tsc --emitDeclarationOnly` separately —
 *   tsup v8.5.x injects a hardcoded `baseUrl: "."` that triggers TS5101
 *   under TypeScript 6).
 * - `outDir`: `"dist"`
 * - `external`: HOST_EXTERNAL_MODULES (+ HOST_BROWSER_EXTERNAL_MODULES
 *   when `platform === "browser"`)
 * - `noExternal`: match-everything regex
 *
 * Any default can be overridden by passing `overrides`. The `external`
 * array is always merged with the host externals so the contract cannot
 * be silently broken — passing `external: []` does NOT clear the host
 * externals.
 *
 * ## Usage
 *
 * Single-target (most plugins):
 * ```ts
 * import { defineLvisPluginConfig } from "@lvis/plugin-sdk/build";
 * export default defineLvisPluginConfig();
 * ```
 *
 * Override defaults:
 * ```ts
 * export default defineLvisPluginConfig({
 *   entry: ["src/main.ts"],
 *   target: "node18",
 *   format: ["esm", "cjs"],
 * });
 * ```
 *
 * Multi-target (host + browser UI):
 * ```ts
 * export default defineLvisPluginConfig([
 *   { entry: ["src/hostPlugin.ts"] },
 *   {
 *     entry: { "ui/panel": "src/ui/panel.ts" },
 *     target: "es2020",
 *     platform: "browser",
 *     clean: false,
 *   },
 * ]);
 * ```
 */
export function defineLvisPluginConfig(
  overrides: Options | Options[] = {},
): Options | Options[] {
  if (Array.isArray(overrides)) {
    return overrides.map(applyDefaults);
  }
  return applyDefaults(overrides);
}

function applyDefaults(override: Options): Options {
  const isBrowser = override.platform === "browser";
  const hostExternals: (string | RegExp)[] = isBrowser
    ? [...HOST_EXTERNAL_MODULES, ...HOST_BROWSER_EXTERNAL_MODULES]
    : [...HOST_EXTERNAL_MODULES];

  const baseDefaults: Options = {
    entry: ["src/index.ts", "src/hostPlugin.ts"],
    format: ["esm"],
    target: "node20",
    clean: true,
    sourcemap: true,
    splitting: false,
    dts: false,
    outDir: "dist",
    noExternal: [/.*/],
  };

  const userExternals: (string | RegExp)[] = Array.isArray(override.external)
    ? override.external
    : [];

  return {
    ...baseDefaults,
    ...override,
    external: dedupeExternals([...hostExternals, ...userExternals]),
    noExternal: override.noExternal ?? baseDefaults.noExternal,
  };
}

function dedupeExternals(items: (string | RegExp)[]): (string | RegExp)[] {
  const seenStrings = new Set<string>();
  const out: (string | RegExp)[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      if (seenStrings.has(item)) continue;
      seenStrings.add(item);
    }
    out.push(item);
  }
  return out;
}
