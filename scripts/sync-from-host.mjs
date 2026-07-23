#!/usr/bin/env node
/**
 * Mechanically mirror the Host-owned public plugin contract into this SDK.
 *
 * Source:
 *   lvis-app/src/plugins/public-contract.ts
 *
 * Target:
 *   lvis-plugin-sdk/src/index.ts
 *
 * The Host source owns the declaration boundary, JSDoc, and runtime ABI values.
 * This script only resolves that file, normalizes line endings, and prepends a
 * generated-file banner. It must not select declarations, rewrite fields,
 * synthesize docs, or add SDK-owned behavior.
 *
 * Usage:
 *   node scripts/sync-from-host.mjs
 *   node scripts/sync-from-host.mjs --check
 *
 * Host source resolution:
 *   1. LVIS_HOST_REPO_ROOT
 *   2. LVIS_HOST_CONTRACT_PATH
 *   3. LVIS_HOST_REPO_URL cloned at HOST_REF
 *   4. ../lvis-app sibling checkout
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TARGET = path.join(ROOT, "src/index.ts");
const HOST_CONTRACT_REL = "src/plugins/public-contract.ts";

let cloneTmpDir = null;

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
      "LVIS_HOST_REPO_URL must not carry userinfo. Use git credential configuration instead.",
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

function contractAt(root) {
  return path.join(root, HOST_CONTRACT_REL);
}

function resolveHostContractPath() {
  const envRoot = process.env.LVIS_HOST_REPO_ROOT;
  if (envRoot && fs.existsSync(envRoot)) {
    return { path: contractAt(envRoot), source: `env-root:${envRoot}` };
  }

  const envPath = process.env.LVIS_HOST_CONTRACT_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return { path: envPath, source: `env:${envPath}` };
  }

  const url = process.env.LVIS_HOST_REPO_URL;
  if (url) {
    assertSafeRepoUrl(url);
    const ref = process.env.HOST_REF || "main";
    assertSafeGitRef(ref);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "host-contract-"));
    cloneTmpDir = tmp;
    try {
      execFileSync(
        "git",
        ["clone", "--depth", "1", "--branch", ref, url, tmp],
        { stdio: "inherit" },
      );
    } catch (error) {
      console.error(`Failed to clone ${url}.`);
      throw error;
    }
    return { path: contractAt(tmp), source: `clone@${ref}` };
  }

  const siblingRoot = path.resolve(ROOT, "..", "lvis-app");
  if (fs.existsSync(siblingRoot)) {
    return { path: contractAt(siblingRoot), source: `sibling:${siblingRoot}` };
  }

  console.error(
    "ERROR: Host public contract source not configured. Set LVIS_HOST_REPO_ROOT, " +
      "set LVIS_HOST_CONTRACT_PATH, place lvis-app next to this repository, or " +
      "set LVIS_HOST_REPO_URL (and optionally HOST_REF).",
  );
  process.exit(1);
}

function normalize(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trimEnd() + "\n";
}

function render(hostContract) {
  return normalize(
    `// AUTO-GENERATED — DO NOT EDIT. Regenerate via: bun run sync:from-host
//
// Mechanical mirror of lvis-app/src/plugins/public-contract.ts.
// The Host owns every declaration, JSDoc block, and runtime ABI value below.

${normalize(hostContract)}`,
  );
}

try {
  const { path: hostContractPath, source } = resolveHostContractPath();
  if (!fs.existsSync(hostContractPath)) {
    console.error(`ERROR: Host public contract not found at ${hostContractPath}`);
    process.exit(1);
  }

  const output = render(fs.readFileSync(hostContractPath, "utf8"));
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, "utf8") : "";
    if (normalize(current) !== output) {
      console.error(
        "DRIFT DETECTED: src/index.ts differs from the Host public contract. " +
          "Run 'bun run sync:from-host' and commit the generated result.",
      );
      process.exit(1);
    }
    console.log("No drift.");
  } else {
    fs.writeFileSync(TARGET, output);
    console.log(`Wrote ${TARGET} (${output.length} bytes) from ${source}`);
  }
} finally {
  if (cloneTmpDir) {
    fs.rmSync(cloneTmpDir, { recursive: true, force: true });
  }
}
