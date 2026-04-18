#!/usr/bin/env node
/**
 * Extract type-only declarations from lvis-app/src/plugins/types.ts into src/index.ts.
 *
 * Usage:
 *   node scripts/sync-from-host.mjs              # write src/index.ts
 *   node scripts/sync-from-host.mjs --check      # exit 1 if regenerated output differs from committed
 *
 * Strategy (§S2.2 of autopilot-impl.md):
 *   1. Resolve host types.ts source via LVIS_HOST_TYPES_PATH env var, else local sibling
 *      (../lvis-app/src/plugins/types.ts), else clone lvis-app at $HOST_REF.
 *   2. Parse with TypeScript compiler API (ts.createSourceFile).
 *   3. Walk top-level statements, keep: InterfaceDeclaration, TypeAliasDeclaration,
 *      EnumDeclaration, ClassDeclaration, VariableStatement — only when `export` modifier present.
 *   4. Preserve leading JSDoc via ts.getLeadingCommentRanges.
 *   5. Reject default exports (exit 1).
 *   6. Prepend fixed banner.
 *   7. Write to src/index.ts; in --check mode diff against existing and exit non-zero.
 */

import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function resolveHostTypesPath() {
  const envPath = process.env.LVIS_HOST_TYPES_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return { path: envPath, source: `env:${envPath}` };
  }
  const local = path.resolve(ROOT, "../lvis-app/src/plugins/types.ts");
  if (fs.existsSync(local)) return { path: local, source: "local-sibling" };
  const ref = process.env.HOST_REF || "main";
  const tmp = fs.mkdtempSync("/tmp/lvis-host-");
  execSync(
    `git clone --depth 1 --branch ${ref} https://github.com/lvis-project/lvis-app.git ${tmp}`,
    { stdio: "inherit" }
  );
  return { path: path.join(tmp, "src/plugins/types.ts"), source: `clone@${ref}` };
}

function hasExportModifier(stmt) {
  return stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function hasDefaultModifier(stmt) {
  return stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
}

function extract(srcPath) {
  const text = fs.readFileSync(srcPath, "utf8");
  const sf = ts.createSourceFile(srcPath, text, ts.ScriptTarget.ES2022, true);
  const chunks = [];

  for (const stmt of sf.statements) {
    if (!hasExportModifier(stmt)) continue;

    if (hasDefaultModifier(stmt)) {
      console.error(
        `ERROR: default export not allowed in host types.ts (found at pos ${stmt.pos})`
      );
      process.exit(1);
    }

    // Reject re-exports (export { X } from "./y") — types.ts must be self-contained.
    if (ts.isExportDeclaration(stmt)) {
      console.error(
        `ERROR: re-export declarations not supported: ${text.slice(stmt.pos, stmt.end).trim()}`
      );
      process.exit(1);
    }

    const supported =
      ts.isInterfaceDeclaration(stmt) ||
      ts.isTypeAliasDeclaration(stmt) ||
      ts.isEnumDeclaration(stmt) ||
      ts.isClassDeclaration(stmt) ||
      ts.isVariableStatement(stmt);

    if (!supported) {
      console.error(
        `ERROR: unsupported exported form: ${ts.SyntaxKind[stmt.kind]} — ${text
          .slice(stmt.pos, stmt.end)
          .trim()
          .slice(0, 120)}`
      );
      process.exit(1);
    }

    const leading = ts.getLeadingCommentRanges(text, stmt.pos) ?? [];
    const commentText = leading.map((r) => text.slice(r.pos, r.end)).join("\n");
    const declText = text.slice(stmt.pos, stmt.end).trimStart();
    chunks.push((commentText ? commentText.trim() + "\n" : "") + declText);
  }

  return chunks.join("\n\n") + "\n";
}

function render(body) {
  return `// AUTO-GENERATED from lvis-app/src/plugins/types.ts — DO NOT EDIT. Run: bun run sync:from-host
//
// @lvis/plugin-sdk — type-only public surface of the LVIS plugin contract.
// This file mirrors the exports of \`lvis-app/src/plugins/types.ts\`.

${body}`;
}

const { path: hostPath, source } = resolveHostTypesPath();
const output = render(extract(hostPath));
const target = path.join(ROOT, "src/index.ts");

if (process.argv.includes("--check")) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current !== output) {
    console.error("DRIFT DETECTED: src/index.ts differs from regenerated output.");
    process.exit(1);
  }
  console.log("No drift.");
} else {
  fs.writeFileSync(target, output);
  console.log(`Wrote ${target} (${output.length} bytes) from ${source}`);
  void source;
}
