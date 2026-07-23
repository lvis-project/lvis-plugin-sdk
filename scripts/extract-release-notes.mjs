#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const VERSION_PATTERN = "(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractReleaseNotes(changelog, tag) {
  const tagMatch = tag.match(new RegExp(`^v(${VERSION_PATTERN})$`));
  if (!tagMatch) throw new Error(`invalid release tag: ${tag}`);

  const version = escapeRegExp(tagMatch[1]);
  const heading = new RegExp(`^## (?:v${version}|${version}|\\[${version}\\])(?:\\s|$)`);
  const lines = changelog.replaceAll("\r", "").split("\n");
  const start = lines.findIndex((line) => heading.test(line));
  if (start < 0) return null;

  const endOffset = lines.slice(start + 1).findIndex((line) => /^##\s/.test(line));
  const end = endOffset < 0 ? lines.length : start + 1 + endOffset;
  const notes = lines.slice(start + 1, end).join("\n").trim();
  return notes.length > 0 ? notes : null;
}

function valueAfter(args, flag, fallback) {
  const index = args.indexOf(flag);
  return index < 0 ? fallback : args[index + 1];
}

export function run(args = process.argv.slice(2)) {
  const tag = valueAfter(args, "--tag");
  const changelogPath = valueAfter(args, "--changelog", "CHANGELOG.md");
  const outputPath = valueAfter(args, "--output");
  if (!tag || !changelogPath || !outputPath) {
    throw new Error("usage: extract-release-notes --tag vX.Y.Z --output <path> [--changelog <path>]");
  }

  const notes = extractReleaseNotes(readFileSync(changelogPath, "utf8"), tag);
  if (!notes) throw new Error(`CHANGELOG.md has no non-empty section for ${tag}`);
  writeFileSync(outputPath, `${notes}\n`, "utf8");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
