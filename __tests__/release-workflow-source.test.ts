import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = fs.readFileSync(
  path.join(ROOT, ".github/workflows/release.yml"),
  "utf8",
);
const MANIFEST_WORKFLOW = fs.readFileSync(
  path.join(ROOT, ".github/workflows/validate-plugin-manifests.yml"),
  "utf8",
);

function jobBlock(name: string): string {
  const start = WORKFLOW.indexOf(`  ${name}:\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = WORKFLOW.slice(start + 1).search(/\n  [a-zA-Z0-9_-]+:\n/u);
  return next < 0
    ? WORKFLOW.slice(start)
    : WORKFLOW.slice(start, start + 1 + next);
}

describe("release workflow trust bootstrap", () => {
  it("only releases from a trusted default-branch repository dispatch", () => {
    expect(WORKFLOW).not.toMatch(/push:\s*\n\s+tags:/);
    expect(WORKFLOW).not.toContain("workflow_dispatch:");
    expect(WORKFLOW).toContain("repository_dispatch:");
    expect(WORKFLOW).toContain("types: [release-sdk]");
    expect(WORKFLOW).toContain("github.event.client_payload.tag");
    expect(WORKFLOW).toContain(
      "if: github.repository == 'lvis-project/lvis-plugin-sdk'",
    );
  });

  it("proves tag protection before candidate code can execute", () => {
    expect(WORKFLOW).toContain(
      "node .release-control/scripts/verify-release-integrity.mjs protection",
    );
    expect(WORKFLOW.indexOf("Verify active release-tag ruleset")).toBeLessThan(
      WORKFLOW.indexOf("Checkout candidate tag without executing it"),
    );
    expect(WORKFLOW.indexOf("Verify active release-tag ruleset")).toBeLessThan(
      WORKFLOW.indexOf("working-directory: .release-candidate"),
    );
  });

  it("verifies candidate and Host commits with trusted control-plane scripts", () => {
    expect(WORKFLOW).toContain(
      "node .release-control/scripts/verify-release-integrity.mjs",
    );
    expect(WORKFLOW).not.toMatch(
      /^\s+node scripts\/verify-release-integrity\.mjs/m,
    );
    expect(WORKFLOW.indexOf("Verify annotated tag and SDK release commit")).toBeLessThan(
      WORKFLOW.indexOf("working-directory: .release-candidate"),
    );
  });
  it("never persists checkout credentials, including the exact Host checkout", () => {
    const checkoutBlocks = WORKFLOW.split(/\n(?=\s+- name:|\s+- uses:)/)
      .filter((block) => block.includes("actions/checkout@"));
    expect(checkoutBlocks).toHaveLength(6);
    for (const block of checkoutBlocks) {
      expect(block).toContain("persist-credentials: false");
    }

    const hostCheckout = WORKFLOW.slice(
      WORKFLOW.indexOf("- name: Checkout exact Host contract commit"),
      WORKFLOW.indexOf("- name: Verify Host commit belongs to Host main"),
    );
    expect(hostCheckout).toContain("persist-credentials: false");
  });

  it("runs candidate code only in the read-only build job", () => {
    const build = jobBlock("build");
    const release = jobBlock("release");

    expect(build).toContain("permissions:\n      contents: read");
    expect(build).toContain("working-directory: .release-candidate");
    expect(build).toContain("bun run test");
    expect(build).toContain("bun run build");

    expect(release).toContain("needs: build");
    expect(release).toContain("permissions:\n      contents: write");
    expect(release).not.toContain("working-directory: .release-candidate");
    expect(release).not.toContain("oven-sh/setup-bun");
    expect(release).not.toMatch(/\b(?:bun|npm|npx|pnpm|yarn)\s+(?:run|install|test|build|publish)\b/u);
    expect(release).toContain(
      "node .release-control/scripts/verify-release-integrity.mjs",
    );
  });
});

describe("manifest validation credential boundary", () => {
  it("never exposes the plugin roster or App key to pull-request workflow code", () => {
    expect(MANIFEST_WORKFLOW).not.toContain("pull_request:");
    expect(MANIFEST_WORKFLOW).not.toContain("workflow_dispatch:");
    expect(MANIFEST_WORKFLOW).toContain("repository_dispatch:");
    expect(MANIFEST_WORKFLOW).toContain("types: [validate-plugin-manifests]");
    expect(MANIFEST_WORKFLOW).toContain(
      "if: github.repository == 'lvis-project/lvis-plugin-sdk'",
    );
  });
});
