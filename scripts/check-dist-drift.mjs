#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = options.capture ? (result.stderr || "").trim() : "";
    throw new Error(stderr || `${cmd} ${args.join(" ")} failed`);
  }
  return result.stdout ?? "";
}

run("bun", ["run", "build"]);

const dirty = run("git", ["diff", "--name-only", "--", "dist"], { capture: true }).trim();
const untracked = run(
  "git",
  ["ls-files", "--others", "--exclude-standard", "--", "dist"],
  { capture: true },
).trim();

if (dirty.length > 0 || untracked.length > 0) {
  console.error("DIST DRIFT DETECTED: dist/ is stale after rebuilding.");
  if (dirty.length > 0) console.error(dirty);
  if (untracked.length > 0) console.error(untracked);
  process.exit(1);
}

console.log("dist/ is up to date.");
