#!/usr/bin/env node
/**
 * check-plugin-css.mjs — CSS namespace enforcement script.
 *
 * Globs all CSS files (and extracts inline CSS strings from JS/TS files)
 * in the current working directory and validates every plugin-local CSS
 * custom property against the namespace rules in validatePluginCssNamespace.
 *
 * Usage (from a plugin repo's CI):
 *   node node_modules/@lvis/plugin-sdk/scripts/check-plugin-css.mjs
 *
 * Or via the package.json script entry:
 *   bun run check:plugin-css
 *
 * Environment variables:
 *   LVIS_CSS_FAIL_ON_WARN=1  — exit 1 even when only warnings are present
 *   LVIS_CSS_MODE=warn       — use warn mode (findings go to warnings, not violations)
 *   LVIS_CSS_ROOTS=dist,src  — comma-separated directories to scan (default: dist,src)
 *   LVIS_CSS_VENDOR=tw,radix — override vendor allowlist (comma-separated prefixes)
 *   LVIS_CSS_PREFIXES=pm,li  — restrict to these plugin prefixes (comma-separated)
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import { createRequire } from "node:module";

// ---------------------------------------------------------------------------
// Resolve validatePluginCssNamespace from the SDK dist.
// When this script runs from inside the SDK repo itself (e.g. bun run check:plugin-css)
// we resolve from ../dist; when installed as a dependency the same relative
// path still works because the script ships inside the package.
// ---------------------------------------------------------------------------
const _require = createRequire(import.meta.url);
const distPath = new URL("../dist/ui/tokens/validate.js", import.meta.url);

let validatePluginCssNamespace;
try {
  const mod = await import(distPath.href);
  validatePluginCssNamespace = mod.validatePluginCssNamespace;
} catch {
  console.error(
    "check-plugin-css: could not load dist/ui/tokens/validate.js — run `bun run build` first.",
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Configuration from env
// ---------------------------------------------------------------------------
const mode = process.env.LVIS_CSS_MODE === "warn" ? "warn" : "error";
const failOnWarn = process.env.LVIS_CSS_FAIL_ON_WARN === "1";
const scanRoots = (process.env.LVIS_CSS_ROOTS ?? "dist,src").split(",").map((s) => s.trim());
const vendorAllowlist = process.env.LVIS_CSS_VENDOR
  ? process.env.LVIS_CSS_VENDOR.split(",").map((s) => s.trim())
  : undefined;
const validPrefixes = process.env.LVIS_CSS_PREFIXES
  ? process.env.LVIS_CSS_PREFIXES.split(",").map((s) => s.trim())
  : undefined;

const root = process.cwd();

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/** Recursively collect files with given extensions under dir. */
async function collectFiles(dir, exts) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results; // directory doesn't exist — skip silently
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(full, exts)));
    } else if (entry.isFile() && exts.includes(extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Extract CSS-like content from a JS/TS/JSX/TSX file:
 * - Tagged template literals: css`...`, injectTokenCss(`...`), styled.div`...`
 * - String arguments to common CSS-injection functions
 *
 * This is a best-effort regex scan, not a full AST parse.
 */
function extractInlineCss(source) {
  const chunks = [];
  // Tagged template literals: css`...` or /* css */`...`
  const taggedTpl = /(?:css|cssText|injectTokenCss)\s*`([\s\S]*?)`/g;
  for (const m of source.matchAll(taggedTpl)) chunks.push(m[1]);
  return chunks.join("\n");
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------

const cssExts = [".css"];
const jsExts = [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"];

const violations = [];
const warnings = [];

for (const scanRoot of scanRoots) {
  const absRoot = join(root, scanRoot);

  // CSS files — scan directly
  for (const file of await collectFiles(absRoot, cssExts)) {
    const css = await readFile(file, "utf-8");
    const result = validatePluginCssNamespace(css, { mode, vendorAllowlist, validPrefixes });
    const rel = relative(root, file);
    for (const v of result.violations) violations.push(`  ${rel}: ${v}`);
    for (const w of result.warnings) warnings.push(`  ${rel}: ${w}`);
  }

  // JS/TS files — extract inline CSS strings
  for (const file of await collectFiles(absRoot, jsExts)) {
    const source = await readFile(file, "utf-8");
    const css = extractInlineCss(source);
    if (!css) continue;
    const result = validatePluginCssNamespace(css, { mode, vendorAllowlist, validPrefixes });
    const rel = relative(root, file);
    for (const v of result.violations) violations.push(`  ${rel}: ${v}`);
    for (const w of result.warnings) warnings.push(`  ${rel}: ${w}`);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (warnings.length > 0) {
  console.warn("CSS namespace warnings:");
  for (const w of warnings) console.warn(w);
}

if (violations.length > 0) {
  console.error("CSS namespace violations:");
  for (const v of violations) console.error(v);
  process.exit(1);
}

if (warnings.length > 0 && failOnWarn) {
  console.error(`LVIS_CSS_FAIL_ON_WARN=1: treating ${warnings.length} warning(s) as errors.`);
  process.exit(1);
}

console.log("CSS namespace: ok");
