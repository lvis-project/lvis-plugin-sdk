#!/usr/bin/env node
/**
 * Sync `LVIS_TOKEN_NAMES` from the host's `PLUGIN_TOKEN_NAMES`.
 *
 * The host (`lvis-app/src/ipc/domains/plugins.ts`) is the canonical SoT
 * for the `--lvis-*` design-token allowlist — it filters tokens at
 * `host.theme.changed` broadcast time. The SDK exports the same names
 * for the build-time validator (`@lvis/plugin-sdk/ui/tokens/validate`).
 *
 * If the two drift, plugins ship references the host silently drops:
 * invisible regression. This script regenerates the SDK list from the
 * host file so the lockstep is enforced by CI.
 *
 * Usage:
 *   node scripts/sync-tokens-from-host.mjs              # write SDK file
 *   node scripts/sync-tokens-from-host.mjs --check      # exit 1 on drift
 *
 * Host source resolution (in order):
 *   1. LVIS_HOST_PLUGINS_TS_PATH env var pointing at the host's plugins.ts
 *   2. LVIS_HOST_TYPES_PATH env var (assumes plugins.ts at sibling
 *      `<host-root>/src/ipc/domains/plugins.ts`).
 *   3. Git clone via LVIS_HOST_REPO_URL + HOST_REF (default `main`).
 *
 * Writes a stable, canonically-formatted block in
 * `src/ui/tokens/index.ts` between the markers
 *     // <SOT-TOKENS-BEGIN>
 *     // <SOT-TOKENS-END>
 * Anything outside the markers is left alone.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TARGET = path.join(ROOT, "src/ui/tokens/index.ts");
const BEGIN_MARKER = "// <SOT-TOKENS-BEGIN>";
const END_MARKER = "// <SOT-TOKENS-END>";

let CLONE_TMP_DIR = null;

function resolveHostPluginsPath() {
  const explicit = process.env.LVIS_HOST_PLUGINS_TS_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return { path: explicit, source: `env:${explicit}` };
  }

  const typesPath = process.env.LVIS_HOST_TYPES_PATH;
  if (typesPath && fs.existsSync(typesPath)) {
    // typesPath = <host>/src/plugins/types.ts → strip 3 segments to get <host>
    const hostRoot = path.resolve(path.dirname(typesPath), "../..");
    const candidate = path.join(hostRoot, "src/ipc/domains/plugins.ts");
    if (fs.existsSync(candidate)) {
      return { path: candidate, source: `derived-from-types-path:${candidate}` };
    }
  }

  const url = process.env.LVIS_HOST_REPO_URL;
  if (!url) {
    console.error(
      "ERROR: host source not configured. Set LVIS_HOST_PLUGINS_TS_PATH or LVIS_HOST_TYPES_PATH (with a sibling plugins.ts), or set LVIS_HOST_REPO_URL.",
    );
    process.exit(1);
  }
  const ref = process.env.HOST_REF || "main";
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "host-tokens-"));
  CLONE_TMP_DIR = tmp;
  try {
    execSync(`git clone --depth 1 --branch ${ref} ${url} ${tmp}`, { stdio: "inherit" });
  } catch (e) {
    console.error(`Failed to clone ${url}.`);
    throw e;
  }
  return { path: path.join(tmp, "src/ipc/domains/plugins.ts"), source: `clone@${ref}` };
}

/**
 * Pull every string literal out of `const PLUGIN_TOKEN_NAMES = new Set([...])`.
 * Tolerates whitespace, line breaks, and trailing commas. Rejects when the
 * declaration shape is unexpected so a host-side rename surfaces loudly
 * rather than silently emptying the list.
 */
function extractTokenNames(srcText) {
  const m = srcText.match(/const\s+PLUGIN_TOKEN_NAMES\s*=\s*new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/);
  if (!m) {
    console.error("ERROR: could not find `const PLUGIN_TOKEN_NAMES = new Set([...])` in host file.");
    process.exit(1);
  }
  const names = [...m[1].matchAll(/"(--lvis-[a-z0-9-]+)"/g)].map((mm) => mm[1]);
  if (names.length === 0) {
    console.error("ERROR: PLUGIN_TOKEN_NAMES literal contained no `--lvis-*` entries.");
    process.exit(1);
  }
  return names;
}

function renderBlock(names) {
  const formatted = names.map((n) => `  "${n}",`).join("\n");
  return [
    BEGIN_MARKER,
    "// Synced from host `PLUGIN_TOKEN_NAMES` by scripts/sync-tokens-from-host.mjs.",
    "// Do not edit manually — `bun run sync:tokens-from-host` regenerates this block.",
    "export const LVIS_TOKEN_NAMES = [",
    formatted,
    "] as const;",
    END_MARKER,
  ].join("\n");
}

function replaceBlock(targetText, newBlock) {
  const re = new RegExp(`${BEGIN_MARKER}[\\s\\S]*?${END_MARKER}`);
  if (!re.test(targetText)) {
    console.error(
      `ERROR: ${TARGET} does not contain ${BEGIN_MARKER}/${END_MARKER}. Add the markers manually around the LVIS_TOKEN_NAMES export before running this script.`,
    );
    process.exit(1);
  }
  return targetText.replace(re, newBlock);
}

const normalize = (s) => s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trimEnd() + "\n";

try {
  const { path: hostPath, source } = resolveHostPluginsPath();
  const names = extractTokenNames(fs.readFileSync(hostPath, "utf8"));
  const block = renderBlock(names);
  const current = fs.readFileSync(TARGET, "utf8");
  const next = replaceBlock(current, block);

  if (process.argv.includes("--check")) {
    if (normalize(current) !== normalize(next)) {
      console.error("DRIFT DETECTED: SDK LVIS_TOKEN_NAMES differs from host PLUGIN_TOKEN_NAMES.");
      process.exit(1);
    }
    console.log(`No drift (${names.length} tokens).`);
  } else {
    fs.writeFileSync(TARGET, normalize(next));
    console.log(`Wrote ${TARGET} with ${names.length} tokens from ${source}`);
  }
} finally {
  if (CLONE_TMP_DIR) {
    fs.rmSync(CLONE_TMP_DIR, { recursive: true, force: true });
  }
}
