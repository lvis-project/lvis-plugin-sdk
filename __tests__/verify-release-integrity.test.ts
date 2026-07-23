import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts/verify-release-integrity.mjs");

function git(repo: string, ...args: string[]): string {
  return execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Release Test",
      GIT_AUTHOR_EMAIL: "release-test@example.com",
      GIT_COMMITTER_NAME: "Release Test",
      GIT_COMMITTER_EMAIL: "release-test@example.com",
    },
  }).trim();
}

function run(repo: string, ...args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args, "--repo", repo], {
    encoding: "utf8",
  });
}

describe("verify-release-integrity", () => {
  let repo: string;
  let releaseSha: string;
  let hostSha: string;

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), "sdk-release-test-"));
    git(repo, "init", "-b", "main");
    fs.writeFileSync(
      path.join(repo, "package.json"),
      `${JSON.stringify({ name: "@lvis/plugin-sdk", version: "11.0.0" })}\n`,
    );
    git(repo, "add", "package.json");
    git(repo, "commit", "-m", "initial");
    releaseSha = git(repo, "rev-parse", "HEAD");
    hostSha = "1234567890abcdef1234567890abcdef12345678";
    git(repo, "tag", "-a", "v11.0.0", "-m", `release\n\nHost-Ref: ${hostSha}`);
  });

  afterEach(() => {
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it("accepts an annotated semver tag on main and records immutable provenance", () => {
    const provenance = path.join(repo, "provenance.json");
    const result = run(
      repo,
      "release",
      "--tag",
      "v11.0.0",
      "--main-ref",
      "main",
      "--provenance",
      provenance,
    );

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(fs.readFileSync(provenance, "utf8"))).toMatchObject({
      tag: "v11.0.0",
      version: "11.0.0",
      releaseCommitSha: releaseSha,
      hostContractCommitSha: hostSha,
    });
  });

  it("rejects a lightweight tag", () => {
    git(repo, "tag", "v11.0.1");
    const result = run(repo, "release", "--tag", "v11.0.1", "--main-ref", "main");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must be an annotated tag");
  });

  it("rejects a non-semver tag", () => {
    const result = run(repo, "release", "--tag", "release-11", "--main-ref", "main");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("strict SemVer");
  });

  it("rejects unknown and duplicate command options", () => {
    const unknown = run(repo, "release", "--tag", "v11.0.0", "--bogus", "value");
    expect(unknown.status).toBe(1);
    expect(unknown.stderr).toContain("Unknown option for release: --bogus");

    const duplicate = run(
      repo,
      "release",
      "--tag",
      "v11.0.0",
      "--tag",
      "v11.0.0",
    );
    expect(duplicate.status).toBe(1);
    expect(duplicate.stderr).toContain("Duplicate option: --tag");
  });

  it("rejects a tag whose peeled commit is not on main", () => {
    git(repo, "switch", "--orphan", "side");
    fs.writeFileSync(path.join(repo, "package.json"), '{"version":"11.0.0"}\n');
    git(repo, "add", "package.json");
    git(repo, "commit", "-m", "side");
    git(repo, "tag", "-a", "v11.0.2", "-m", `side\n\nHost-Ref: ${hostSha}`);

    const result = run(repo, "release", "--tag", "v11.0.2", "--main-ref", "main");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("is not an ancestor of main");
  });

  it("reports an invalid main ref as a git error instead of an ancestry result", () => {
    const result = run(
      repo,
      "release",
      "--tag",
      "v11.0.0",
      "--main-ref",
      "refs/heads/missing",
    );
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain("is not an ancestor");
    expect(result.stderr).toMatch(/fatal:|valid object|unknown revision/i);
  });

  it("rejects a package version mismatch", () => {
    fs.writeFileSync(path.join(repo, "package.json"), '{"version":"10.0.0"}\n');
    const result = run(repo, "release", "--tag", "v11.0.0", "--main-ref", "main");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("does not match package.json version 10.0.0");
  });

  it("rejects verification from a checkout other than the peeled tag commit", () => {
    fs.writeFileSync(path.join(repo, "after-tag.txt"), "later\n");
    git(repo, "add", "after-tag.txt");
    git(repo, "commit", "-m", "after tag");

    const result = run(repo, "release", "--tag", "v11.0.0", "--main-ref", "main");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("does not match peeled release commit");
  });

  it("rejects a tag whose peeled commit differs from the tag-push event SHA", () => {
    const result = run(
      repo,
      "release",
      "--tag",
      "v11.0.0",
      "--main-ref",
      "main",
      "--expected-release-sha",
      "abcdef1234567890abcdef1234567890abcdef12",
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("does not match event SHA");
  });

  it("requires exactly one full Host-Ref trailer", () => {
    git(repo, "tag", "-d", "v11.0.0");
    git(repo, "tag", "-a", "v11.0.0", "-m", "missing host ref");
    const result = run(repo, "release", "--tag", "v11.0.0", "--main-ref", "main");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("exactly one Host-Ref");
  });

  it("rejects a requested Host ref that differs from the tag annotation", () => {
    const result = run(
      repo,
      "release",
      "--tag",
      "v11.0.0",
      "--main-ref",
      "main",
      "--expected-host-ref",
      "abcdef1234567890abcdef1234567890abcdef12",
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("does not match requested Host ref");
  });

  it("verifies an exact Host commit is on Host main", () => {
    const result = run(repo, "host", "--host-ref", releaseSha, "--main-ref", "main");
    expect(result.status, result.stderr).toBe(0);

    git(repo, "switch", "--orphan", "host-side");
    fs.writeFileSync(path.join(repo, "side.txt"), "side\n");
    git(repo, "add", "side.txt");
    git(repo, "commit", "-m", "host side");
    const sideSha = git(repo, "rev-parse", "HEAD");
    const rejected = run(repo, "host", "--host-ref", sideSha, "--main-ref", "main");
    expect(rejected.status).toBe(1);
    expect(rejected.stderr).toContain("is not an ancestor of main");
  });
});
