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
    expect(checkoutBlocks).toHaveLength(3);
    for (const block of checkoutBlocks) {
      expect(block).toContain("persist-credentials: false");
    }

    const hostCheckout = WORKFLOW.slice(
      WORKFLOW.indexOf("- name: Checkout exact Host contract commit"),
      WORKFLOW.indexOf("- name: Verify Host commit belongs to Host main"),
    );
    expect(hostCheckout).toContain("persist-credentials: false");
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
