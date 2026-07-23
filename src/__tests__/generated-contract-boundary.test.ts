import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const INDEX_URL = new URL("../index.ts", import.meta.url);
const SYNC_SCRIPT_URL = new URL("../../scripts/sync-from-host.mjs", import.meta.url);

describe("generated Host contract mirror", () => {
  it("keeps declaration selection and JSDoc policy out of the SDK generator", async () => {
    const script = await readFile(SYNC_SCRIPT_URL, "utf8");

    for (const forbidden of [
      "HOST_INTERNAL_DECLARATIONS",
      "DOC_OVERRIDES",
      "JSDOC_CATALOG",
      "sanitizeForPublic",
      "enrichWithJsDoc",
      'from "typescript"',
    ]) {
      expect(script).not.toContain(forbidden);
    }
    expect(script).toContain("src/plugins/public-contract.ts");
  });

  it("publishes Host deprecation docs without Host-private DTO declarations", async () => {
    const source = await readFile(INDEX_URL, "utf8");

    expect(source).toContain("@deprecated Owner: `lvis-app` plugin runtime.");
    expect(source).toContain("no active manifest declares `keywords`");
    for (const declaration of [
      "PluginRegistryEntryInstallSource",
      "PluginRegistryEntry",
      "PluginRegistry",
      "PluginMarketplaceItem",
    ]) {
      expect(source).not.toMatch(
        new RegExp(`^export (?:interface|type|class|const|enum) ${declaration}\\b`, "m"),
      );
    }
  });
});
