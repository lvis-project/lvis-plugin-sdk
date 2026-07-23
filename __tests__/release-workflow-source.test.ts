import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = fs.readFileSync(
  path.join(ROOT, ".github/workflows/release.yml"),
  "utf8",
);

describe("release workflow trust bootstrap", () => {
  it("only releases from a default-branch workflow dispatch", () => {
    expect(WORKFLOW).not.toMatch(/push:\s*\n\s+tags:/);
    expect(WORKFLOW).toContain(
      "if: github.ref == format('refs/heads/{0}', github.event.repository.default_branch)",
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
});
