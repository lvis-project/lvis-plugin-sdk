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
  it("only releases from default-branch repository dispatch", () => {
    expect(WORKFLOW).not.toMatch(/push:\s*\n\s+tags:/);
    expect(WORKFLOW).not.toContain("workflow_dispatch:");
    expect(WORKFLOW).toContain("repository_dispatch:");
    expect(WORKFLOW).toContain("types: [release-sdk]");
    expect(WORKFLOW).toContain("github.event.client_payload.tag");
    expect(WORKFLOW).toContain(
      "if: github.repository == 'lvis-project/lvis-plugin-sdk'",
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

  it("does not persist write-capable credentials in any checkout", () => {
    expect(WORKFLOW.match(/uses: actions\/checkout@/g)).toHaveLength(3);
    expect(WORKFLOW.match(/persist-credentials: false/g)).toHaveLength(3);
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
