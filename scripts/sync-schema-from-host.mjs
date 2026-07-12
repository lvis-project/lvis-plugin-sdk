#!/usr/bin/env node
/**
 * Mirror the host-owned plugin manifest JSON Schema into this repo.
 *
 * WHAT IT SYNCS
 *   lvis-app `schemas/plugin-manifest.schema.json`  (the SOT)
 *     -> this repo's `schemas/plugin-manifest.schema.json`  (a verbatim copy)
 *
 * WHY THE HOST IS THE SOURCE
 *   The host owns the manifest-shape contract: it vendors the schema, imports it
 *   as a bundler-visible JSON module, and compiles it with AJV at plugin load
 *   (`src/plugins/runtime/manifest-validation.ts`). It does NOT import this SDK
 *   at runtime. The schema used to be SDK-canonical; it no longer is. This copy
 *   is therefore a MIRROR with no authority of its own — it must never diverge,
 *   and this script must never "improve" it on the way through. A rule that
 *   belongs in the contract belongs in the host's schema.
 *
 * WHO CONSUMES THE MIRROR (why it is not simply deleted)
 *   1. `.github/workflows/validate-plugin-manifests.yml` — validates every active
 *      plugin repo's published `plugin.json` against this copy with ajv-cli.
 *   2. lvis-marketplace `.github/workflows/schema-relaxation-guard.yml` — reads
 *      `vendor/lvis-plugin-sdk/schemas/plugin-manifest.schema.json` (this repo is
 *      a git submodule there) and fails a marketplace PR that would relax the
 *      accepted manifest shape.
 *   Both want a schema pinned to an SDK tag rather than to whatever host `main`
 *   happens to be at that moment, which is what this mirror provides.
 *
 * Usage:
 *   node scripts/sync-schema-from-host.mjs              # write schemas/plugin-manifest.schema.json
 *   node scripts/sync-schema-from-host.mjs --check      # exit 1 on drift (CI: drift-check.yml)
 *
 * Host source resolution mirrors `sync-from-host.mjs`:
 *   1. LVIS_HOST_REPO_ROOT env var pointing to a local lvis-app checkout.
 *   2. LVIS_HOST_SCHEMA_PATH env var (preferred for local dev / CI sparse checkout)
 *   3. LVIS_HOST_REPO_URL clone @ HOST_REF (default branch: main)
 *   4. ../lvis-app sibling checkout (implicit dev convenience fallback)
 *
 * Precedence: explicit env-configured URL clone (3) wins over implicit
 * sibling discovery (4) — see sync-from-host.mjs header for rationale
 * (issue #106).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TARGET = path.join(ROOT, "schemas/plugin-manifest.schema.json");
const HOST_SCHEMA_REL = "schemas/plugin-manifest.schema.json";

let CLONE_TMP_DIR = null;

const SAFE_REPO_HOST_ALLOWLIST = new Set([
  "github.com",
  "codeload.github.com",
]);

function assertSafeRepoUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`LVIS_HOST_REPO_URL is not a valid URL: ${rawUrl}`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(
      `LVIS_HOST_REPO_URL must use https:// (got ${parsed.protocol}). Refusing to clone.`,
    );
  }
  if (!SAFE_REPO_HOST_ALLOWLIST.has(parsed.hostname)) {
    throw new Error(
      `LVIS_HOST_REPO_URL host ${parsed.hostname} is not allowlisted. Allowed: ${[...SAFE_REPO_HOST_ALLOWLIST].join(", ")}.`,
    );
  }
  if (parsed.username || parsed.password) {
    throw new Error(
      `LVIS_HOST_REPO_URL must not carry userinfo (user:pass@host). Strip credentials and use git's credential helper instead.`,
    );
  }
  if (parsed.port) {
    throw new Error(
      `LVIS_HOST_REPO_URL must not carry an explicit port (got :${parsed.port}).`,
    );
  }
}

function assertSafeGitRef(ref) {
  if (!/^[A-Za-z0-9._\/-]+$/.test(ref) || ref.startsWith("-")) {
    throw new Error(
      `HOST_REF contains characters outside the safe set or starts with '-': ${ref}`,
    );
  }
}

function resolveHostSchemaPath() {
  const envRoot = process.env.LVIS_HOST_REPO_ROOT;
  if (envRoot && fs.existsSync(envRoot)) {
    return { path: path.join(envRoot, HOST_SCHEMA_REL), source: `env-root:${envRoot}` };
  }

  const envPath = process.env.LVIS_HOST_SCHEMA_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return { path: envPath, source: `env:${envPath}` };
  }

  // Precedence: explicit URL clone wins over implicit sibling-checkout
  // (issue #106). See sync-from-host.mjs for the full rationale.
  const url = process.env.LVIS_HOST_REPO_URL;
  if (url) {
    assertSafeRepoUrl(url);
    const ref = process.env.HOST_REF || "main";
    assertSafeGitRef(ref);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "host-schema-"));
    CLONE_TMP_DIR = tmp;
    try {
      execFileSync(
        "git",
        ["clone", "--depth", "1", "--branch", ref, url, tmp],
        { stdio: "inherit" },
      );
    } catch (e) {
      console.error(`Failed to clone ${url}.`);
      throw e;
    }
    return { path: path.join(tmp, HOST_SCHEMA_REL), source: `clone@${ref}` };
  }

  const siblingRoot = path.resolve(ROOT, "..", "lvis-app");
  if (fs.existsSync(siblingRoot)) {
    return { path: path.join(siblingRoot, HOST_SCHEMA_REL), source: `sibling:${siblingRoot}` };
  }

  console.error(
    "ERROR: host schema source not configured. Set LVIS_HOST_REPO_ROOT, set LVIS_HOST_SCHEMA_PATH, place lvis-app next to this repository, or set LVIS_HOST_REPO_URL (and optionally HOST_REF) to clone the host repository.",
  );
  process.exit(1);
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
