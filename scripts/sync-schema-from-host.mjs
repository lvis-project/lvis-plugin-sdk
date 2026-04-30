#!/usr/bin/env node
/**
 * US-A1 — copy the host's `plugin.schema.json` verbatim into the SDK so a
 * plugin author validating against the SDK schema sees byte-identical
 * acceptance behavior to the host.
 *
 * Usage:
 *   node scripts/sync-schema-from-host.mjs              # write schemas/plugin-manifest.schema.json
 *   node scripts/sync-schema-from-host.mjs --check      # exit 1 on drift
 *
 * Host source resolution mirrors `sync-from-host.mjs`:
 *   1. LVIS_HOST_SCHEMA_PATH env var (preferred for local dev / CI sparse checkout)
 *   2. LVIS_HOST_REPO_URL clone @ HOST_REF (default branch: main)
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TARGET = path.join(ROOT, "schemas/plugin-manifest.schema.json");
const HOST_SCHEMA_REL = "schemas/plugin.schema.json";

let CLONE_TMP_DIR = null;

function resolveHostSchemaPath() {
  const envPath = process.env.LVIS_HOST_SCHEMA_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return { path: envPath, source: `env:${envPath}` };
  }

  const url = process.env.LVIS_HOST_REPO_URL;
  if (!url) {
    console.error(
      "ERROR: host schema source not configured. Set LVIS_HOST_SCHEMA_PATH to a local file " +
        "or set LVIS_HOST_REPO_URL (and optionally HOST_REF) to clone the host repository.",
    );
    process.exit(1);
  }
  const ref = process.env.HOST_REF || "main";
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "host-schema-"));
  CLONE_TMP_DIR = tmp;
  try {
    execSync(`git clone --depth 1 --branch ${ref} ${url} ${tmp}`, { stdio: "inherit" });
  } catch (e) {
    console.error(`Failed to clone ${url}.`);
    throw e;
  }
  return { path: path.join(tmp, HOST_SCHEMA_REL), source: `clone@${ref}` };
}

/**
 * Normalize text for stable byte-equality comparison: LF line endings, no
 * trailing whitespace, single trailing newline. The schema is committed in
 * normalized form on both sides; this is just defensive against editors
 * that re-save with CRLF on Windows.
 */
function normalize(s) {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trimEnd() + "\n";
}

try {
  const { path: hostSchemaPath, source } = resolveHostSchemaPath();
  if (!fs.existsSync(hostSchemaPath)) {
    console.error(`ERROR: host schema not found at ${hostSchemaPath}`);
    process.exit(1);
  }
  const hostSchema = normalize(fs.readFileSync(hostSchemaPath, "utf8"));

  if (process.argv.includes("--check")) {
    const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, "utf8") : "";
    if (normalize(current) !== hostSchema) {
      console.error(
        "SCHEMA DRIFT DETECTED: schemas/plugin-manifest.schema.json differs from host schema. " +
          "Run 'bun run sync:schema-from-host' locally and commit the result.",
      );
      process.exit(1);
    }
    console.log("No schema drift.");
  } else {
    fs.writeFileSync(TARGET, hostSchema);
    console.log(`Wrote ${TARGET} (${hostSchema.length} bytes) from ${source}`);
  }
} finally {
  if (CLONE_TMP_DIR) {
    fs.rmSync(CLONE_TMP_DIR, { recursive: true, force: true });
  }
}
