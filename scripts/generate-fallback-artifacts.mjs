#!/usr/bin/env node
// generate-fallback-artifacts.mjs — derive 2 SDK artifacts from
// src/ui/tokens/fallback-dark.json:
//
//   1. src/ui/tokens/_generated-fallback-css.ts — exports `_FALLBACK_CSS`
//      string consumed by inject.ts (replaces previous inline literal).
//   2. src/ui/tokens/lvis-tokens.css — :root rule block.
//
// Run via `bun run generate:fallback` (prebuild hook) or directly.
// `bun run check:fallback-drift` (CI gate) runs this with `--check` and
// fails if either artifact is stale relative to the JSON.
//
// Host's `lvis-app/src/ui/renderer/theme/plugin-token-map.ts` re-imports
// the JSON directly (no generation), so the 3rd artifact in the
// lockstep — `_DARK_BASE` — is kept in sync by ESM import alone.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_JSON = join(ROOT, "src/ui/tokens/fallback-dark.json");
const TARGET_TS = join(ROOT, "src/ui/tokens/_generated-fallback-css.ts");
const TARGET_CSS = join(ROOT, "src/ui/tokens/lvis-tokens.css");

const CHECK = process.argv.includes("--check");

const data = JSON.parse(readFileSync(SOURCE_JSON, "utf8"));
const tokens = data.tokens;
const cssOnly = data.cssOnly ?? {};

if (!tokens || typeof tokens !== "object") {
  console.error("generate-fallback-artifacts: missing `tokens` object in JSON");
  process.exit(1);
}

const formatRule = (record) =>
  Object.entries(record)
    .filter(([k]) => !k.startsWith("_"))
    .map(([k, v]) => `  ${(k + ":").padEnd(24)} ${v};`)
    .join("\n");

const tokensBlock = formatRule(tokens);
const cssOnlyBlock = formatRule(cssOnly);

// ─── lvis-tokens.css ─────────────────────────────────────────────────
const cssContents = `/* @lvis/plugin-sdk — Plugin UI Tokens (AUTO-GENERATED)
 *
 * Generated from src/ui/tokens/fallback-dark.json by
 * scripts/generate-fallback-artifacts.mjs. Edit the JSON, not this file.
 *
 * SDK-owned offline fallback. Host sends real values via IPC; these apply
 * only before the first bridge event (host.theme.changed → useTheme() →
 * applyThemeTokens()). Once tokens arrive, inline style.setProperty()
 * overwrites these values.
 *
 * See: src/ui/tokens/inject.ts:applyThemeTokens, src/ui/hooks/useTheme.ts,
 *      src/ui/hooks/primeTheme.ts
 */

/* ─── Dark (default fallback) ────────────────────────────
 * Source of truth: src/ui/tokens/fallback-dark.json.
 * ────────────────────────────────────────────────────── */
:root {
${tokensBlock}

  /* ─── Static tokens (theme-invariant, CSS-only) ─────── */
  /* Not sent over IPC — value format is too complex for the safety regex. */
${cssOnlyBlock}
}
`;

// ─── _generated-fallback-css.ts ──────────────────────────────────────
const tsContents = `// AUTO-GENERATED — DO NOT EDIT.
// Source: src/ui/tokens/fallback-dark.json
// Regenerate: bun run generate:fallback

/**
 * Offline fallback CSS string applied via injectTokenCss() on first
 * \`ensureFallback()\` call. Mirrors :root in lvis-tokens.css.
 *
 * Single source of truth: fallback-dark.json. The build script
 * (scripts/generate-fallback-artifacts.mjs) regenerates this file +
 * lvis-tokens.css from the JSON, and \`bun run check:fallback-drift\`
 * enforces that they match.
 */
export const _FALLBACK_CSS = \`:root {
${tokensBlock}
${cssOnlyBlock}
}\`;
`;

if (CHECK) {
  const currentCss = (() => { try { return readFileSync(TARGET_CSS, "utf8"); } catch { return ""; } })();
  const currentTs = (() => { try { return readFileSync(TARGET_TS, "utf8"); } catch { return ""; } })();
  const drift = [];
  if (currentCss !== cssContents) drift.push(TARGET_CSS);
  if (currentTs !== tsContents) drift.push(TARGET_TS);
  if (drift.length > 0) {
    console.error("generate-fallback-artifacts — drift detected:");
    for (const f of drift) console.error("  ✗ stale:", f);
    console.error("\nRun `bun run generate:fallback` to refresh.");
    process.exit(1);
  }
  console.log("generate-fallback-artifacts — OK (no drift)");
  process.exit(0);
}

writeFileSync(TARGET_CSS, cssContents);
writeFileSync(TARGET_TS, tsContents);
console.log("generate-fallback-artifacts — wrote:");
console.log("  ", TARGET_CSS);
console.log("  ", TARGET_TS);
