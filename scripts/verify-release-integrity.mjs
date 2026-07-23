#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SEMVER_TAG = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const FULL_SHA = /^[0-9a-f]{40}$/;

function fail(message) {
  throw new Error(message);
}

function git(repo, args, { allowFailure = false } = {}) {
  const result = spawnSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    fail((result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim());
  }
  return result;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (!key.startsWith("--")) fail(`Unexpected argument: ${key}`);
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`Missing value for ${key}`);
    }
    options[key.slice(2)] = value;
    index += 1;
  }
  return { command, options };
}

function requireOption(options, name) {
  const value = options[name];
  if (!value) fail(`Missing required option --${name}`);
  return value;
}

function assertFullSha(value, label) {
  if (!FULL_SHA.test(value)) {
    fail(`${label} must be a lowercase 40-character commit SHA (got ${value})`);
  }
}

function assertAncestor(repo, ancestor, mainRef, label) {
  const result = git(repo, ["merge-base", "--is-ancestor", ancestor, mainRef], {
    allowFailure: true,
  });
  if (result.status !== 0) {
    fail(`${label} ${ancestor} is not an ancestor of ${mainRef}`);
  }
}

function appendOutput(file, values) {
  if (!file) return;
  const body = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  fs.appendFileSync(file, `${body}\n`);
}

function appendSummary(file, lines) {
  if (!file) return;
  fs.appendFileSync(file, `${lines.join("\n")}\n`);
}

function verifyRelease(options) {
  const repo = path.resolve(options.repo ?? ".");
  const tag = requireOption(options, "tag");
  const mainRef = options["main-ref"] ?? "origin/main";
  const match = SEMVER_TAG.exec(tag);
  if (!match) fail(`Release tag must be strict SemVer vMAJOR.MINOR.PATCH (got ${tag})`);

  const tagRef = `refs/tags/${tag}`;
  const tagType = git(repo, ["cat-file", "-t", tagRef]).stdout.trim();
  if (tagType !== "tag") {
    fail(`${tag} must be an annotated tag; lightweight tags cannot be released`);
  }

  const tagObjectSha = git(repo, ["rev-parse", "--verify", tagRef]).stdout.trim();
  const releaseSha = git(repo, ["rev-parse", "--verify", `${tagRef}^{commit}`]).stdout.trim();
  assertFullSha(tagObjectSha, "Tag object");
  assertFullSha(releaseSha, "Peeled release commit");
  const checkoutSha = git(repo, ["rev-parse", "HEAD"]).stdout.trim();
  if (checkoutSha !== releaseSha) {
    fail(`Checked-out commit ${checkoutSha} does not match peeled release commit ${releaseSha}`);
  }
  if (options["expected-release-sha"]) {
    assertFullSha(options["expected-release-sha"], "Expected release SHA");
    if (options["expected-release-sha"] !== releaseSha) {
      fail(
        `Peeled release commit ${releaseSha} does not match event SHA ${options["expected-release-sha"]}`,
      );
    }
  }
  assertAncestor(repo, releaseSha, mainRef, "Release commit");

  const packagePath = path.join(repo, options.package ?? "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const version = match.slice(1).join(".");
  if (packageJson.version !== version) {
    fail(`${tag} does not match package.json version ${packageJson.version}`);
  }

  const hostRefs = git(repo, [
    "for-each-ref",
    "--format=%(trailers:key=Host-Ref,valueonly)",
    tagRef,
  ]).stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (hostRefs.length !== 1) {
    fail(`${tag} annotation must contain exactly one Host-Ref: <40-character SHA> trailer`);
  }
  const hostRef = hostRefs[0];
  assertFullSha(hostRef, "Host-Ref");
  if (options["expected-host-ref"] && options["expected-host-ref"] !== hostRef) {
    fail(
      `Tag Host-Ref ${hostRef} does not match requested Host ref ${options["expected-host-ref"]}`,
    );
  }

  const values = {
    tag,
    version,
    tag_object_sha: tagObjectSha,
    release_sha: releaseSha,
    host_ref: hostRef,
  };
  appendOutput(options.output, values);
  appendSummary(options.summary, [
    "### SDK release integrity",
    "",
    `- Tag: \`${tag}\` (annotated object \`${tagObjectSha}\`)`,
    `- Peeled SDK commit: \`${releaseSha}\``,
    `- SDK main ancestry: \`${mainRef}\``,
    `- Host contract commit: \`${hostRef}\``,
  ]);

  if (options.provenance) {
    fs.writeFileSync(
      options.provenance,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          package: packageJson.name,
          version,
          tag,
          tagObjectSha,
          releaseCommitSha: releaseSha,
          sdkMainRef: mainRef,
          hostContractCommitSha: hostRef,
        },
        null,
        2,
      )}\n`,
    );
  }

  console.log(
    `Verified ${tag}: SDK ${releaseSha} is on ${mainRef}; Host contract ${hostRef}.`,
  );
  return values;
}

function verifyHost(options) {
  const repo = path.resolve(options.repo ?? ".");
  const hostRef = requireOption(options, "host-ref");
  const mainRef = options["main-ref"] ?? "origin/main";
  assertFullSha(hostRef, "Host ref");

  const resolved = git(repo, ["rev-parse", "--verify", `${hostRef}^{commit}`]).stdout.trim();
  if (resolved !== hostRef) {
    fail(`Host ref resolved to ${resolved}, expected exact commit ${hostRef}`);
  }
  const checkoutSha = git(repo, ["rev-parse", "HEAD"]).stdout.trim();
  if (checkoutSha !== hostRef) {
    fail(`Checked-out Host commit ${checkoutSha} does not match requested Host ref ${hostRef}`);
  }
  assertAncestor(repo, hostRef, mainRef, "Host commit");
  appendSummary(options.summary, [
    "",
    "### Host contract integrity",
    "",
    `- Exact Host commit: \`${hostRef}\``,
    `- Host main ancestry: \`${mainRef}\``,
  ]);
  console.log(`Verified Host commit ${hostRef} is on ${mainRef}.`);
  return { host_ref: hostRef };
}

export { verifyHost, verifyRelease };

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const { command, options } = parseArgs(process.argv.slice(2));
    if (command === "release") verifyRelease(options);
    else if (command === "host") verifyHost(options);
    else fail("Usage: verify-release-integrity.mjs <release|host> [options]");
  } catch (error) {
    console.error(`RELEASE INTEGRITY ERROR: ${error.message}`);
    process.exit(1);
  }
}
