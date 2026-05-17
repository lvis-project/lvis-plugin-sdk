/**
 * #893 Stage 1 — apiKeySource contract.
 *
 * Two things must hold for plugins downstream to depend on the new surface:
 *  1. `ResolveApiKeyResult` is a discriminated union — `ok: true` exposes a
 *     bearer thunk and a `release()` disposer, `ok: false` exposes a typed
 *     `reason`. A future regression that collapses the union (e.g. making
 *     `bearer` optional on both branches) would silently break consumers; the
 *     narrow tests here pin the shape at compile time.
 *  2. The schema must accept both `hostSecrets` and `llmKeySource` round-trip
 *     through AJV — without this, a v5.5 host that publishes a manifest with
 *     these fields would fail validation on a v5.5 SDK consumer.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

import type { PluginManifest, ResolveApiKeyResult } from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const schema = require(join(__dirname, "../../schemas/plugin-manifest.schema.json"));

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

function validateManifest(obj: unknown): { valid: boolean; errors: string[] } {
  const valid = validate(obj) as boolean;
  const errors = valid
    ? []
    : (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`);
  return { valid, errors };
}

const VALID_MINIMAL: PluginManifest = {
  id: "com.example.host-key-plugin",
  name: "Host Key Plugin",
  version: "1.0.0",
  entry: "dist/index.js",
  tools: [],
  description: "Plugin that exercises the host-managed key contract.",
};

describe("ResolveApiKeyResult — discriminated union narrowing", () => {
  it("ok: true branch exposes bearer() and release()", () => {
    let released = false;
    const result: ResolveApiKeyResult = {
      ok: true,
      vendor: "openai",
      bearer: () => "sk-test",
      release: () => {
        released = true;
      },
    };

    // The compile-time narrowing is the test — `bearer` and `release` are not
    // accessible on the `ok: false` branch, so referencing them inside the
    // `if (result.ok)` block is what proves the union behaves correctly.
    if (result.ok) {
      expect(result.vendor).toBe("openai");
      expect(result.bearer()).toBe("sk-test");
      expect(typeof result.release).toBe("function");
      result.release();
      expect(released).toBe(true);
    } else {
      throw new Error("unreachable — narrowing failed");
    }
  });

  it("ok: true branch accepts optional baseUrl", () => {
    const result: ResolveApiKeyResult = {
      ok: true,
      vendor: "azure-openai",
      bearer: () => "key",
      baseUrl: "https://example.openai.azure.com/",
      release: () => {},
    };

    if (result.ok) {
      expect(result.baseUrl).toBe("https://example.openai.azure.com/");
    }
  });

  it("ok: false branch exposes typed reason and no bearer", () => {
    const reasons: Array<
      Extract<ResolveApiKeyResult, { ok: false }>["reason"]
    > = [
      "no-host-vendor",
      "vendor-mismatch",
      "not-whitelisted",
      "user-mode-plugin",
      "aborted",
      "user-endpoint-with-host-key",
    ];

    for (const reason of reasons) {
      const result: ResolveApiKeyResult = { ok: false, reason };
      if (!result.ok) {
        expect(result.reason).toBe(reason);
        // @ts-expect-error — `bearer` is not in scope on the failure branch.
        const _bearer = result.bearer;
        void _bearer;
      } else {
        throw new Error("unreachable — narrowing failed");
      }
    }
  });
});

describe("PluginManifest schema — hostSecrets + llmKeySource round-trip", () => {
  it("accepts manifest with hostSecrets.read[]", () => {
    const manifest: PluginManifest = {
      ...VALID_MINIMAL,
      hostSecrets: { read: ["llm.apiKey.openai", "llm.apiKey.azure-openai"] },
    };
    const { valid, errors } = validateManifest(manifest);
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("rejects hostSecrets.read entries that don't match the llm.apiKey.<vendor> pattern", () => {
    const { valid } = validateManifest({
      ...VALID_MINIMAL,
      hostSecrets: { read: ["api.openai.key"] },
    });
    expect(valid).toBe(false);
  });

  it("rejects unknown property under hostSecrets (additionalProperties:false)", () => {
    const { valid } = validateManifest({
      ...VALID_MINIMAL,
      hostSecrets: { read: [], write: [] },
    });
    expect(valid).toBe(false);
  });

  it.each(["host", "plugin", "none"] as const)(
    "accepts llmKeySource: %s",
    (source) => {
      const manifest: PluginManifest = { ...VALID_MINIMAL, llmKeySource: source };
      const { valid, errors } = validateManifest(manifest);
      expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
    },
  );

  it("rejects unknown llmKeySource value", () => {
    const { valid } = validateManifest({
      ...VALID_MINIMAL,
      llmKeySource: "byok",
    });
    expect(valid).toBe(false);
  });

  it("accepts both hostSecrets and llmKeySource together (#893 baseline)", () => {
    const manifest: PluginManifest = {
      ...VALID_MINIMAL,
      hostSecrets: { read: ["llm.apiKey.openai"] },
      llmKeySource: "host",
    };
    const { valid, errors } = validateManifest(manifest);
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("accepts manifest without either field (additive, default 'none')", () => {
    const { valid, errors } = validateManifest(VALID_MINIMAL);
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });
});
