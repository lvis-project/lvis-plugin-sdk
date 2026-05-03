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
 * The match-everything regex used as the helper's `noExternal` value.
 *
 * Exposed so plugin tests can assert that a given dependency name would
 * be matched (and therefore bundled) by the helper-produced config.
 */
// JSDoc cannot embed `*` followed by `/` inside a `/_*_ ... _*_/` block
// without prematurely terminating the comment, so the regex literal is
// constructed via the RegExp constructor.
export const BUNDLE_EVERYTHING_REGEX = new RegExp(".*");

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
export function defineLvisPluginConfig(
  overrides: Options | Options[] = {},
): Options | Options[] {
  if (Array.isArray(overrides)) {
    return overrides.map(applyDefaults);
  }
  return applyDefaults(overrides);
}

function isBrowserBuild(override: Options): boolean {
  if (override.platform === "browser") return true;
  if (override.platform === "node") return false;
  // tsup `target` is `string | string[] | undefined`. Treat any element
  // that looks like a browser target as evidence of a browser build.
  const targets =
    typeof override.target === "string"
      ? [override.target]
      : Array.isArray(override.target)
      ? override.target
      : [];
  return targets.some((t) => looksLikeBrowserTarget(t));
}

function looksLikeBrowserTarget(target: unknown): boolean {
  if (typeof target !== "string") return false;
  const lower = target.toLowerCase();
  // ES targets (es2020 / es2022) are intentionally excluded — they are
  // commonly used for modern Node builds too, and auto-adding react /
  // react-dom externals on a Node build that happens to import React
  // would silently break runtime resolution. Only browser-vendor target
  // names are unambiguous enough to auto-detect; for any other case the
  // plugin author should set `platform: "browser"` explicitly.
  return (
    lower.startsWith("chrome") ||
    lower.startsWith("firefox") ||
    lower.startsWith("safari") ||
    lower.startsWith("edge")
  );
}

function applyDefaults(override: Options): Options {
  const isBrowser = isBrowserBuild(override);
  const hostExternals: (string | RegExp)[] = isBrowser
    ? [...HOST_EXTERNAL_MODULES, ...HOST_BROWSER_EXTERNAL_MODULES]
    : [...HOST_EXTERNAL_MODULES];

  const baseDefaults: Options = {
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
    outDir: "dist",
  };

  const userExternals: (string | RegExp)[] = Array.isArray(override.external)
    ? override.external
    : [];

  // CJS-interop banner — bundled CJS deps in the ESM output need three
  // CJS globals re-injected so they don't crash at runtime:
  //   `require`     — esbuild's dynamic-require shim falls back to a
  //                   throwing Proxy ("Dynamic require of "fs" is not
  //                   supported") when no real `require` is in scope.
  //                   `createRequire(import.meta.url)` provides one.
  //   `__filename`  — referenced by some deps (e.g. parts of
  //                   `node-ical`, `msal-node`) at module load time.
  //                   `fileURLToPath(import.meta.url)` reconstructs it.
  //   `__dirname`   — same — derived from `__filename`.
  //
  // Without this banner the ESM output throws on first import.
  //
  // Skipped for browser builds: `import.meta.url` and `"module"`/`"url"`/
  // `"path"` specifiers aren't browser-resolvable. Browser UI bundles
  // shouldn't pull in Node CJS deps anyway.
  //
  // Helper imports are prefixed with `__lvis` so they cannot collide with
  // user source's own `createRequire`/`fileURLToPath`/`dirname` imports.
  // The CJS-style identifiers (`require`/`__filename`/`__dirname`) are
  // intentionally unprefixed because bundled CJS deps reference them by
  // those exact names.
  //
  // `var` (NOT `const`) is critical: bundled deps frequently emit their
  // own ESM-to-CJS interop preamble like
  //   var __filename = fileURLToPath(import.meta.url);
  // — using `const` here would `SyntaxError: Identifier '__filename'
  // has already been declared`. `var` permits redeclaration (even under
  // strict mode), so multiple definitions coexist; both compute the
  // same value so the final binding is correct regardless of order.
  const cjsInteropJs =
    'import { createRequire as __lvisCreateRequire } from "module";' +
    'import { fileURLToPath as __lvisFileURLToPath } from "url";' +
    'import { dirname as __lvisDirname } from "path";' +
    "var require = __lvisCreateRequire(import.meta.url);" +
    "var __filename = __lvisFileURLToPath(import.meta.url);" +
    "var __dirname = __lvisDirname(__filename);";

  // Banner merge — preserve any user-supplied banner fields (e.g. `css`
  // for browser UI bundles, or extra `js` prologue) while ALWAYS keeping
  // our CJS-interop js on Node builds. Naïve `{...baseDefaults, ...override}`
  // would let `banner: { css: "..." }` silently drop our `js` and reintroduce
  // the dynamic-require crash — that's the bug this PR fixes, so the merge
  // here closes the loophole. User's own `js` is appended after ours so the
  // CJS globals are in scope when user code runs.
  //
  // tsup's `Options['banner']` accepts either an object OR a per-format
  // function `(ctx) => banner | undefined`. Both are handled.
  const userBanner = override.banner;
  const mergeWithCjsInterop = (
    user: { js?: string; css?: string } | undefined,
  ): { js?: string; css?: string } => ({
    ...user,
    js: cjsInteropJs + (user?.js ?? ""),
  });
  const mergedBanner = isBrowser
    ? userBanner
    : typeof userBanner === "function"
      ? (ctx: Parameters<Extract<typeof userBanner, (...args: never) => unknown>>[0]) =>
          mergeWithCjsInterop(userBanner(ctx) || undefined)
      : mergeWithCjsInterop(userBanner);

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
    banner: mergedBanner,
  };
}

function dedupeExternals(items: (string | RegExp)[]): (string | RegExp)[] {
  const seenStrings = new Set<string>();
  const seenRegexSources = new Set<string>();
  const out: (string | RegExp)[] = [];
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
