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
export declare const HOST_EXTERNAL_MODULES: readonly ["electron"];
/**
 * Additional modules treated as external for browser-target plugin
 * bundles (UI panels rendered inside the host renderer process).
 *
 * `react` / `react-dom` MUST come from the host's React context — if a
 * plugin's UI bundle ships its own copy, you get two React instances and
 * the React context API silently fails (provider/consumer mismatch).
 */
export declare const HOST_BROWSER_EXTERNAL_MODULES: readonly ["react", "react-dom"];
/**
 * The match-everything regex used as the helper's `noExternal` value.
 *
 * Exposed so plugin tests can assert that a given dependency name would
 * be matched (and therefore bundled) by the helper-produced config.
 */
export declare const BUNDLE_EVERYTHING_REGEX: RegExp;
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
 * - `external: HOST_EXTERNAL_MODULES` (+ HOST_BROWSER_EXTERNAL_MODULES
 *   for browser builds) — host-provided modules stay external.
 * - `noExternal: [BUNDLE_EVERYTHING_REGEX]` — every other import (deps,
 *   devDeps, transitive) gets bundled into `dist/`. This field is NOT
 *   overridable: the contract is the helper's reason to exist.
 *
 * ## Defaults
 *
 * - `entry`: `["src/hostPlugin.ts"]` — the marketplace contract entry
 *   referenced by `plugin.json`. Plugins that also publish a separate
 *   `src/index.ts` for npm-package consumption should override:
 *   `entry: ["src/index.ts", "src/hostPlugin.ts"]`.
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
 *   when the build is browser-targeted — see below).
 * - `noExternal`: `[BUNDLE_EVERYTHING_REGEX]` (forced, not overridable).
 *
 * Any other default can be overridden via the `overrides` argument. The
 * `external` array is always merged with the host externals so the
 * contract cannot be silently bypassed — passing `external: []` does
 * NOT clear the host externals.
 *
 * ## Browser-build detection
 *
 * A target is considered a browser build when ANY of the following hold:
 * - `platform === "browser"`
 * - `target` is `"chrome*"` / `"firefox*"` / `"safari*"` / `"edge*"`
 *   (case-insensitive). Array targets are checked element-wise.
 *
 * `target: "es2020"` / `"es2022"` is NOT auto-detected as browser:
 * those targets are commonly used for modern Node builds too, and
 * silently adding `react` / `react-dom` externals to a Node build that
 * imports React would break runtime resolution. For browser UI bundles,
 * set `platform: "browser"` explicitly.
 *
 * ## Optional native dependencies
 *
 * `noExternal: [BUNDLE_EVERYTHING_REGEX]` follows ALL imports including
 * `optionalDependencies` (e.g., `chokidar` → `fsevents` on macOS,
 * `ws` → `bufferutil`/`utf-8-validate`). esbuild errors when a referenced
 * optional dep is not installed (typical on cross-platform CI).
 *
 * If your plugin transitively pulls in optional native deps, add them to
 * `external` explicitly:
 *
 * ```ts
 * defineLvisPluginConfig({
 *   external: ["fsevents", "bufferutil", "utf-8-validate"],
 * });
 * ```
 *
 * The host's plugin loader will still resolve these against the consumer
 * machine's optional installs — they're treated as best-effort enhancements,
 * not hard requirements.
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
 * Multi-target (host + browser UI). The browser entry must set
 * `platform: "browser"` explicitly so the helper auto-adds
 * `react` / `react-dom` to `external` (otherwise React would be bundled
 * twice, breaking the host's React context):
 * ```ts
 * export default defineLvisPluginConfig([
 *   { entry: ["src/hostPlugin.ts"] },
 *   {
 *     entry: { "ui/panel": "src/ui/panel.ts" },
 *     platform: "browser",
 *     target: "es2020",
 *     clean: false,
 *   },
 * ]);
 * ```
 */
export declare function defineLvisPluginConfig(overrides?: Options | Options[]): Options | Options[];
//# sourceMappingURL=tsup.d.ts.map