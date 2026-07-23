import { describe, expect, it } from "vitest";
import { extractReleaseNotes } from "../../scripts/extract-release-notes.mjs";

describe("extractReleaseNotes", () => {
  it.each([
    "## v11.1.0 — 2026-07-23",
    "## 11.1.0",
    "## [11.1.0] - 2026-07-23",
  ])("extracts the exact release section from %s", (heading) => {
    const changelog = [
      "# Changelog",
      "",
      heading,
      "",
      "Compatibility: lvis-app >= 0.5.7.",
      "",
      "## v11.0.0",
      "",
      "Older notes.",
    ].join("\n");

    expect(extractReleaseNotes(changelog, "v11.1.0")).toBe(
      "Compatibility: lvis-app >= 0.5.7.",
    );
  });

  it("does not match a version prefix", () => {
    expect(extractReleaseNotes("## v11.1.01\nWrong release.\n", "v11.1.0")).toBeNull();
  });

  it("returns null instead of publishing fallback notes for a missing section", () => {
    expect(extractReleaseNotes("# Changelog\n", "v11.1.0")).toBeNull();
  });

  it("rejects a malformed release tag", () => {
    expect(() => extractReleaseNotes("## v11.1.0\nNotes\n", "11.1.0")).toThrow(
      "invalid release tag",
    );
  });
});
