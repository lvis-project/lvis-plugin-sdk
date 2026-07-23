#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SEMVER_TAG = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const FULL_SHA = /^[0-9a-f]{40}$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
// The release path consumes an existing annotated tag. Update + deletion are
// the immutability controls; creation restriction is intentionally optional.
const REQUIRED_TAG_RULES = Object.freeze(["update", "deletion"]);
const OPTIONS_BY_COMMAND = Object.freeze({
  release: new Set([
    "repo", "tag", "main-ref", "package",
    "expected-host-ref", "output", "summary", "provenance",
  ]),
  host: new Set(["repo", "host-ref", "main-ref", "summary"]),
  protection: new Set(["repository", "tag", "api-url", "output", "summary"]),
});

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
  const allowed = OPTIONS_BY_COMMAND[command];
  if (!allowed) {
    fail("Usage: verify-release-integrity.mjs <release|host|protection> [options]");
  }
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (!key.startsWith("--")) fail(`Unexpected argument: ${key}`);
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`Missing value for ${key}`);
    }
    const name = key.slice(2);
    if (!allowed.has(name)) fail(`Unknown option for ${command}: ${key}`);
    if (Object.prototype.hasOwnProperty.call(options, name)) fail(`Duplicate option: ${key}`);
    options[name] = value;
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
  if (result.status === 1) {
    fail(`${label} ${ancestor} is not an ancestor of ${mainRef}`);
  }
  if (result.status !== 0) {
    fail((result.stderr || result.stdout || `git merge-base failed with status ${result.status}`).trim());
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

function githubFnmatch(pattern, value) {
  if (pattern === "~ALL") return true;
  if (pattern.startsWith("~")) return false;

  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        while (pattern[index + 1] === "*") index += 1;
        if (pattern[index + 1] === "/") {
          expression += "(?:.*/)?";
          index += 1;
        } else {
          expression += ".*";
        }
      } else {
        expression += "[^/]*";
      }
      continue;
    }
    if (character === "?") {
      expression += "[^/]";
      continue;
    }
    if (character === "[") {
      const end = pattern.indexOf("]", index + 1);
      if (end === -1) return false;
      const contents = pattern.slice(index + 1, end);
      // GitHub does not support complemented character classes in ruleset
      // fnmatch patterns. Treat malformed or unsupported classes as no match.
      if (!contents || contents.startsWith("^") || contents.startsWith("!")) {
        return false;
      }
      expression += `[${contents.replaceAll("\\", "\\\\")}]`;
      index = end;
      continue;
    }
    if (character === "\\") {
      if (index + 1 >= pattern.length) return false;
      index += 1;
      expression += pattern[index].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      continue;
    }
    expression += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  expression += "$";

  try {
    return new RegExp(expression).test(value);
  } catch {
    return false;
  }
}

function rulesetTargetsRef(ruleset, ref) {
  const refName = ruleset?.conditions?.ref_name;
  if (!refName || !Array.isArray(refName.include) || !Array.isArray(refName.exclude)) {
    return false;
  }
  return (
    refName.include.some((pattern) => (
      typeof pattern === "string" && githubFnmatch(pattern, ref)
    ))
    && !refName.exclude.some((pattern) => (
      typeof pattern === "string" && githubFnmatch(pattern, ref)
    ))
  );
}

async function githubRequestJson(url) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    fail("GITHUB_TOKEN or GH_TOKEN is required to query repository rulesets");
  }
  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (error) {
    fail(`GitHub API request failed: ${error.message}`);
  }
  if (!response.ok) {
    fail(`GitHub API GET ${url} returned HTTP ${response.status}`);
  }
  try {
    return await response.json();
  } catch (error) {
    fail(`GitHub API GET ${url} returned invalid JSON: ${error.message}`);
  }
}

async function authorityRequest(requestJson, url, expected) {
  let result;
  try {
    result = await requestJson(url);
  } catch (error) {
    fail(`Tag-protection authority unavailable: ${error.message}`);
  }
  if (expected === "array" && !Array.isArray(result)) {
    fail("Tag-protection authority unavailable: ruleset list was not an array");
  }
  if (expected === "object" && (!result || typeof result !== "object" || Array.isArray(result))) {
    fail("Tag-protection authority unavailable: ruleset detail was not an object");
  }
  return result;
}

async function verifyTagProtection(options, { requestJson = githubRequestJson } = {}) {
  const repository = options.repository ?? process.env.GITHUB_REPOSITORY;
  if (!repository || !REPOSITORY.test(repository)) {
    fail(`Repository must be OWNER/REPO (got ${repository ?? ""})`);
  }
  const tag = requireOption(options, "tag");
  if (!SEMVER_TAG.test(tag)) {
    fail(`Release tag must be strict SemVer vMAJOR.MINOR.PATCH (got ${tag})`);
  }
  const ref = `refs/tags/${tag}`;
  const apiUrl = (options["api-url"] ?? process.env.GITHUB_API_URL ?? "https://api.github.com")
    .replace(/\/+$/, "");
  const [owner, repo] = repository.split("/").map(encodeURIComponent);
  const matchingRulesets = [];

  for (let page = 1; page <= 100; page += 1) {
    const listUrl = `${apiUrl}/repos/${owner}/${repo}/rulesets`
      + `?includes_parents=false&targets=tag&per_page=100&page=${page}`;
    const summaries = await authorityRequest(requestJson, listUrl, "array");

    for (const summary of summaries) {
      if (
        summary?.enforcement !== "active"
        || summary?.source_type !== "Repository"
        || String(summary?.source ?? "").toLowerCase() !== repository.toLowerCase()
      ) {
        continue;
      }
      if (!Number.isInteger(summary.id) || summary.id <= 0) {
        fail("Tag-protection authority unavailable: active ruleset has no valid id");
      }
      const detailUrl = `${apiUrl}/repos/${owner}/${repo}/rulesets/${summary.id}`
        + "?includes_parents=false";
      const detail = await authorityRequest(requestJson, detailUrl, "object");
      if (
        detail.enforcement === "active"
        && detail.target === "tag"
        && detail.source_type === "Repository"
        && String(detail.source ?? "").toLowerCase() === repository.toLowerCase()
        && rulesetTargetsRef(detail, ref)
      ) {
        matchingRulesets.push(detail);
      }
    }

    if (summaries.length < 100) break;
    if (page === 100) {
      fail("Tag-protection authority unavailable: ruleset pagination exceeded 100 pages");
    }
  }

  const ruleTypes = new Set(
    matchingRulesets.flatMap((ruleset) => (
      Array.isArray(ruleset.rules)
        ? ruleset.rules.map((rule) => rule?.type).filter((type) => typeof type === "string")
        : []
    )),
  );
  const missingRules = REQUIRED_TAG_RULES.filter((type) => !ruleTypes.has(type));
  if (matchingRulesets.length === 0 || missingRules.length > 0) {
    const reason = matchingRulesets.length === 0
      ? "no active repository tag ruleset targets the exact ref"
      : `matching rulesets lack required rules: ${missingRules.join(", ")}`;
    fail(`Release tag ${ref} is not protected: ${reason}`);
  }

  const rulesetIds = matchingRulesets.map((ruleset) => ruleset.id).join(",");
  appendOutput(options.output, {
    protected_tag_ref: ref,
    protection_ruleset_ids: rulesetIds,
  });
  appendSummary(options.summary, [
    "### SDK release tag protection",
    "",
    `- Exact tag ref: \`${ref}\``,
    `- Active repository rulesets: \`${rulesetIds}\``,
    `- Enforced restrictions: \`${REQUIRED_TAG_RULES.join(", ")}\``,
  ]);
  console.log(
    `Verified ${ref} is covered by active repository ruleset(s) ${rulesetIds}.`,
  );
  return { ref, ruleset_ids: matchingRulesets.map((ruleset) => ruleset.id) };
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

export { githubFnmatch, verifyHost, verifyRelease, verifyTagProtection };

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const { command, options } = parseArgs(process.argv.slice(2));
    if (command === "release") verifyRelease(options);
    else if (command === "host") verifyHost(options);
    else await verifyTagProtection(options);
  } catch (error) {
    console.error(`RELEASE INTEGRITY ERROR: ${error.message}`);
    process.exit(1);
  }
}
