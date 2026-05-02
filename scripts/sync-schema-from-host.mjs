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

/**
 * H6 — cross-field invariant `auth.statusTool ∈ uiCallable[]` (and the
 * matching `loginTool` / `logoutTool`) currently lives only in prose
 * under `properties.auth.description`. Inject a JSON Schema `allOf`
 * clause that lifts the *structural half* of the invariant — when
 * `auth` is declared, `uiCallable` MUST also be a non-empty array — so
 * AJV catches the most common manifest mistake (forgetting `uiCallable`
 * entirely while declaring `auth`).
 *
 * The full value-level cross-reference (statusTool/loginTool/logoutTool
 * MUST each appear inside the uiCallable array) cannot be expressed in
 * pure draft-07 without AJV's non-standard `$data` extension, so it is
 * still enforced in `manifest-validation.ts` on the host side. The SDK
 * test suite (`auth-cross-field` describe block) covers the structural
 * check and documents the remaining gap. Idempotent — when the host
 * schema already carries an `allOf` clause we leave it alone.
 */
function ensureAuthUiCallableInvariant(schema) {
  if (Array.isArray(schema.allOf)) return schema;
  schema.allOf = [
    {
      $comment:
        "auth contract requires a uiCallable allowlist — the three referenced tool names MUST also be in uiCallable[]; value-level cross-check is enforced in lvis-app's manifest-validation.ts",
      if: { required: ["auth"] },
      then: {
        required: ["uiCallable"],
        properties: {
          uiCallable: { type: "array", minItems: 1 },
        },
      },
    },
  ];
  return schema;
}

/**
 * M13 — $schema URL migration. Plugin authors may set
 * `"$schema": "https://sdk.lvis.com/schemas/plugin.schema.json"` (the
 * pre-rename URL) or the new `https://sdk.lvisai.xyz/...`. Accept both
 * for one release window so plugins don't fail validation mid-migration.
 * The accepted set is broadened from `format: uri` to an explicit enum
 * once both URLs become canonical references; for now we keep `format:
 * uri` (lenient) and leave the migration plan in README.md. This pass
 * is a no-op today but exists as the obvious anchor point for the next
 * step in the migration. Idempotent.
 */
function applyDollarSchemaMigration(schema) {
  // Reserved for the deprecate-then-remove step. README.md documents the
  // current state. Nothing to mutate here today.
  return schema;
}

/**
 * PR #62 — marketplace publish channel is stable-only SemVer (no
 * pre-release / build metadata, no leading zeros). The SDK schema MUST
 * gate the same input the publish.yml workflow rejects so plugin
 * authors fail at AJV time rather than at tag time.
 *
 * The host's plugin.schema.json is currently still on the looser pattern
 * (allows `1.2.3-beta.1`); until host PR catches up the SDK keeps the
 * stricter version. Idempotent — only rewrites the lenient pattern when
 * we see it.
 */
function tightenVersionPatternToStable(schema) {
  const STRICT =
    "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$";
  const STRICT_DESC =
    "Stable SemVer (MAJOR.MINOR.PATCH, no leading zeros). Pre-release / build-metadata suffixes are not supported on the marketplace publish channel — the per-plugin publish.yml rejects them at tag time. Aligning the schema with that gate so AJV fails earlier.";
  const versionField = schema.properties?.version;
  if (versionField && versionField.pattern !== STRICT) {
    versionField.pattern = STRICT;
    versionField.description = STRICT_DESC;
  }
  // Also tighten the per-tool version + deprecatedSince patterns inside
  // toolSchemas.<tool> so they match the top-level rule.
  const toolEntry =
    schema.properties?.toolSchemas?.additionalProperties?.properties;
  if (toolEntry?.version && toolEntry.version.pattern !== STRICT) {
    toolEntry.version.pattern = STRICT;
    toolEntry.version.description =
      "§6.4 Tool versioning — optional stable SemVer (MAJOR.MINOR.PATCH, no leading zeros) for this tool. When omitted, the plugin manifest's top-level version is used. Same strictness as the top-level version field.";
  }
  if (toolEntry?.deprecatedSince && toolEntry.deprecatedSince.pattern !== STRICT) {
    toolEntry.deprecatedSince.pattern = STRICT;
    toolEntry.deprecatedSince.description =
      "Stable SemVer (MAJOR.MINOR.PATCH) of the manifest version that deprecated this tool.";
  }
  return schema;
}

/**
 * Phase-1 schema-master sync — author + uiSlots + bounded configSchema default.
 *
 * The host's `plugin.schema.json` historically had a richer `author` field
 * (PR #404 era) that was lost during the Phase-1 prune. The host doesn't
 * read it, but plugin authors expect to declare credit somewhere — keeping
 * it in the SDK schema so consumers (marketplace UI, IDE intellisense)
 * have a place to surface "made by". `publisher` (organization) and
 * `author` (individual) are intentionally distinct.
 */
function ensurePluginManifestAuthor(schema) {
  const props = schema.properties;
  if (props && !props.author) {
    props.author = {
      type: "string",
      minLength: 1,
      maxLength: 256,
      description:
        "Plugin author — individual maintainer name or contact (distinct from `publisher`, which is the publishing organization). Surfaced in catalog / IDE intellisense; not used for permission decisions.",
    };
  }
  return schema;
}

/**
 * `uiSlots` — top-level array of slot identifiers the plugin advertises.
 * Distinct from `ui[].slot` which is the per-extension binding (richer:
 * id + slot + kind + entry). `uiSlots` is metadata so a host can show
 * "this plugin uses slots: sidebar, toolbar" in the marketplace listing
 * without parsing the full `ui[]` array. Empty array is allowed.
 */
function ensurePluginManifestUiSlots(schema) {
  const props = schema.properties;
  if (props && !props.uiSlots) {
    props.uiSlots = {
      type: "array",
      maxItems: 32,
      items: {
        type: "string",
        pattern: "^[a-z][a-z0-9-]*$",
        maxLength: 64,
      },
      description:
        "Top-level advertisement of UI slot names this plugin participates in. Marketplace metadata only — actual extension binding lives in `ui[].slot`. Kebab-case identifiers, ≤32 entries.",
    };
  }
  return schema;
}

/**
 * configSchema default — was `{}` (anything goes), now oneOf bounded so
 * a publisher can't ship a 30 MB JSON `default` and DoS the catalog.
 * Cherry-picked from marketplace-side hardening (see lvis-marketplace
 * PR #83). Keeps semantics identical for legitimate small defaults
 * (string ≤1 KB, number, boolean, null, array ≤64, object ≤32 props).
 * Idempotent — only mutates when the value is the literal empty schema.
 */
function ensureBoundedConfigSchemaDefault(schema) {
  const fieldDef =
    schema.properties?.configSchema?.properties?.properties?.additionalProperties
      ?.properties?.default;
  if (!fieldDef) return schema;
  if (fieldDef.anyOf) return schema; // already bounded (current canonical form)
  // Migrate legacy oneOf form (PR #68 first iteration) — oneOf requires
  // *exactly one* match, but an integer matches both `{type: "number"}` and
  // `{type: "integer"}`, breaking ajv validation. anyOf is the correct
  // disjunction operator for bounded-primitive enumeration.
  if (fieldDef.oneOf) {
    delete fieldDef.oneOf;
    Object.keys(fieldDef).forEach((k) => {
      if (k !== "description") delete fieldDef[k];
    });
  }
  // Only upgrade the literal `{}` (any value) form. If the host has
  // intentionally constrained `default` to something else, leave it.
  if (Object.keys(fieldDef).filter((k) => k !== "description").length !== 0) return schema;
  schema.properties.configSchema.properties.properties.additionalProperties.properties.default = {
    description:
      "Default value for the form field. Outer JSON byte-size cap is enforced server-side (see marketplace publisher.py); the schema bounds object/array primitives so a pathological default can't blow up the catalog.",
    anyOf: [
      { type: "string", maxLength: 1024 },
      { type: "number" },
      { type: "boolean" },
      { type: "null" },
      { type: "array", maxItems: 64 },
      { type: "object", maxProperties: 32 },
    ],
  };
  return schema;
}

function postProcessSdkSchema(text) {
  const obj = JSON.parse(text);
  tightenVersionPatternToStable(obj);
  ensureAuthUiCallableInvariant(obj);
  applyDollarSchemaMigration(obj);
  ensurePluginManifestAuthor(obj);
  ensurePluginManifestUiSlots(obj);
  ensureBoundedConfigSchemaDefault(obj);
  return JSON.stringify(obj, null, 2) + "\n";
}

try {
  const { path: hostSchemaPath, source } = resolveHostSchemaPath();
  if (!fs.existsSync(hostSchemaPath)) {
    console.error(`ERROR: host schema not found at ${hostSchemaPath}`);
    process.exit(1);
  }
  const rawHostSchema = fs.readFileSync(hostSchemaPath, "utf8");
  const hostSchema = normalize(postProcessSdkSchema(rawHostSchema));

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
