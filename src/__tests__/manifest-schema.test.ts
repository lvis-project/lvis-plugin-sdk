/**
 * Manifest JSON-schema — acceptance tests for the host-mirrored schema.
 *
 * `schemas/plugin-manifest.schema.json` is a verbatim mirror of the host's SOT
 * copy, which the host compiles with AJV at plugin load. The SDK itself compiles
 * nothing at runtime any more, so this suite builds the validator locally with
 * the SAME AJV options the host uses (`buildManifestValidator()` in
 * lvis-app `src/plugins/runtime/manifest-validation.ts`). That keeps this file
 * an honest gate on what the host will actually accept: if the options drift
 * apart, these tests stop predicting host behavior.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { ValidateFunction } from "ajv";

const require = createRequire(import.meta.url);

function compileSchema(): ValidateFunction {
  const ajv = new Ajv({
    strict: true,
    strictRequired: false,
    allErrors: true,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  return ajv.compile(require("../../schemas/plugin-manifest.schema.json"));
}

let validate: ValidateFunction;

beforeAll(() => {
  // Hard gate: the mirrored schema MUST compile cleanly under AJV strict:true —
  // a schema the host cannot compile fails plugin loading closed.
  validate = compileSchema();
});

function check(obj: unknown): {
  valid: boolean;
  errors: string[];
  rawErrors: NonNullable<ValidateFunction["errors"]>;
} {
  const valid = validate(obj) as boolean;
  const rawErrors = valid ? [] : (validate.errors ?? []);
  const errors = rawErrors.map((e) => `${e.instancePath} ${e.message}`);
  return { valid, errors, rawErrors };
}

const BASE = {
  id: "ms-graph",
  name: "LVIS Microsoft 365",
  version: "1.0.0",
  entry: "dist/index.js",
  description: "Fixture manifest for schema tests.",
};

const pureTool = (over: Record<string, unknown> = {}) => ({
  name: "t_ping",
  description: "Ping tool that returns a status object.",
  inputSchema: { type: "object", properties: {} },
  _meta: { ui: { visibility: ["model", "app"] } },
  ...over,
});

describe("plugin-manifest schema (v6) — compiles + validates", () => {
  it("the mirrored schema compiles under the host's AJV options without throwing", () => {
    expect(() => compileSchema()).not.toThrow();
  });

  // ── accepts ────────────────────────────────────────────────────────────
  it("accepts a full pure manifest (ms-graph migrated shape)", () => {
    const manifest = {
      ...BASE,
      tools: [
        pureTool({ name: "msgraph_email_list", _meta: { ui: { visibility: ["model", "app"] } } }),
        pureTool({
          name: "msgraph_email_read",
          _meta: { ui: { visibility: ["model"] }, "lvisai/pathFields": ["attachmentPath"] },
          outputSchema: { type: "object", properties: {} },
          icons: [{ src: "icon.png", mimeType: "image/png", sizes: "48x48" }],
          title: "Read email",
        }),
        pureTool({ name: "msgraph_status", _meta: { ui: { visibility: ["app"] } } }),
      ],
    };
    const { valid, errors } = check(manifest);
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  // ── vendor _meta namespace: lvisai/* is the SOLE accepted spelling ──
  //
  // `_meta` is `additionalProperties: false`, so the accepted vendor key is a
  // hard part of the contract: only `lvisai/pathFields` is declared. The plugin
  // repos' pre-commit hook and CI validate `plugin.json` with ajv-cli against
  // exactly this file (see dev-tools/scripts/run-local-checks.mjs). The legacy
  // reverse-DNS `xyz.lvis/pathFields` alias was dropped in lock-step with the
  // host (lvis-app#1606) once the transitional dual-read was removed fail-closed;
  // an out-of-process plugin built against SDK v10 can no longer ship it.
  it("accepts the new lvisai/pathFields vendor key", () => {
    const manifest = {
      ...BASE,
      tools: [
        pureTool({ _meta: { ui: { visibility: ["model"] }, "lvisai/pathFields": ["srcPath"] } }),
      ],
    };
    const { valid, errors } = check(manifest);
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("REJECTS the legacy xyz.lvis/pathFields key (removed after host #1606, fail-closed)", () => {
    // The `_meta` vendor rename (`xyz.lvis/* → lvisai/*`) dropped both the host's
    // transitional dual-read AND the schema's legacy property. Because tool `_meta`
    // is `additionalProperties:false`, a manifest still declaring the legacy key is
    // now REJECTED — NOT silently accepted with its security-bearing pathFields
    // ignored (that would be fail-OPEN: the host permission gate would stop seeing
    // the plugin's declared filesystem effects). Mirrors the host's own inverted
    // validator test (manifest-validator-host-sot.test.ts). Because the SDK is
    // what out-of-process plugins compile/validate against, this rejection also
    // guarantees a plugin built with SDK v10 cannot ship the legacy key on the wire.
    const manifest = {
      ...BASE,
      tools: [
        pureTool({ _meta: { ui: { visibility: ["model"] }, "xyz.lvis/pathFields": ["srcPath"] } }),
      ],
    };
    const { valid, rawErrors } = check(manifest);
    expect(valid).toBe(false);
    // The rejection specifically names the legacy key as the disallowed additional
    // property (not some unrelated failure).
    expect(rawErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "additionalProperties",
          params: expect.objectContaining({ additionalProperty: "xyz.lvis/pathFields" }),
        }),
      ]),
    );
  });

  it("REJECTS a tool carrying both spellings (the legacy arm poisons the whole _meta)", () => {
    const manifest = {
      ...BASE,
      tools: [
        pureTool({
          _meta: {
            ui: { visibility: ["model"] },
            "lvisai/pathFields": ["srcPath"],
            "xyz.lvis/pathFields": ["srcPath"],
          },
        }),
      ],
    };
    const { valid, rawErrors } = check(manifest);
    expect(valid).toBe(false);
    expect(rawErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "additionalProperties",
          params: expect.objectContaining({ additionalProperty: "xyz.lvis/pathFields" }),
        }),
      ]),
    );
  });

  it("rejects a legacy manifest verbatim (legacy arm removed — string tools + toolSchemas + uiActions)", () => {
    const manifest = {
      ...BASE,
      tools: ["msgraph_email_list", "msgraph_email_read"],
      uiActions: { msgraph_status: {}, msgraph_email_list: {} },
      auth: { statusTool: "msgraph_status", loginTool: "msgraph_auth" },
      toolSchemas: {
        msgraph_email_list: {
          description: "List inbox emails for the user.",
          category: "read",
          inputSchema: { type: "object", properties: {} },
        },
      },
    };
    const { valid } = check(manifest);
    expect(valid).toBe(false);
  });

  it("accepts a pure manifest with auth but no uiActions (conditional-d guard)", () => {
    const manifest = {
      ...BASE,
      tools: [pureTool()],
      auth: { statusTool: "t_ping", loginTool: "t_login" },
    };
    const { valid, errors } = check(manifest);
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("rejects a legacy auth manifest with string tools + uiActions (legacy arm removed)", () => {
    const manifest = {
      ...BASE,
      tools: ["t_ping"],
      uiActions: { t_ping: {} },
      auth: { statusTool: "t_ping", loginTool: "t_ping" },
    };
    const { valid } = check(manifest);
    expect(valid).toBe(false);
  });

  it("accepts an empty tools:[] (minItems:0 — template / MCP-server manifests)", () => {
    const { valid, errors } = check({ ...BASE, tools: [] });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("rejects the removed toolSchemas map even alongside empty tools:[]", () => {
    const { valid } = check({ ...BASE, tools: [], toolSchemas: {} });
    expect(valid).toBe(false);
  });

  it("rejects the removed uiActions map (legacy UI-only shape gone)", () => {
    const { valid } = check({ ...BASE, tools: [], uiActions: { t_ping: {} } });
    expect(valid).toBe(false);
  });

  // ── rejects ────────────────────────────────────────────────────────────
  it.each([["category", "read"], ["workerId", "w1"], ["writesToOwnSandbox", true]])(
    "rejects a pure tool carrying the removed field %s (additionalProperties:false)",
    (field, value) => {
      const { valid } = check({ ...BASE, tools: [pureTool({ [field]: value })] });
      expect(valid).toBe(false);
    },
  );

  it("rejects a pure _meta.ui.visibility: [] (minItems:1)", () => {
    const { valid } = check({ ...BASE, tools: [pureTool({ _meta: { ui: { visibility: [] } } })] });
    expect(valid).toBe(false);
  });

  // The rename covers `pathFields` and nothing else. `category` was hard-cut
  // (#885 Phase R — the host derives the effective category per invocation and
  // never reads a declared one), so it stays rejected, and moving to the `lvisai/`
  // namespace must not quietly resurrect it: `_meta` is additionalProperties:false
  // and `lvisai/pathFields` is now the SOLE declared vendor key (the legacy
  // reverse-DNS `xyz.lvis/*` alias was removed in lock-step with host #1606).
  it.each([
    ["xyz.lvis/pathFields"],
    ["xyz.lvis/category"],
    ["lvisai/category"],
    ["lvisai/workerId"],
    ["lvisai/rawResult"],
  ])("rejects an undeclared _meta key (%s)", (key) => {
    const bad = pureTool({ _meta: { ui: { visibility: ["model"] }, [key]: "read" } });
    const { valid } = check({ ...BASE, tools: [bad] });
    expect(valid).toBe(false);
  });

  it("rejects a pure manifest that also carries toolSchemas (conditional-c)", () => {
    const { valid } = check({
      ...BASE,
      tools: [pureTool()],
      toolSchemas: {
        t_ping: { description: "Ping tool, long enough.", inputSchema: { type: "object", properties: {} } },
      },
    });
    expect(valid).toBe(false);
  });

  it("rejects a pure manifest that also carries uiActions (conditional-c)", () => {
    const { valid } = check({ ...BASE, tools: [pureTool()], uiActions: { t_ping: {} } });
    expect(valid).toBe(false);
  });

  it("rejects a MIXED array [string, object] (matches neither oneOf arm)", () => {
    const { valid } = check({
      ...BASE,
      tools: ["foo", { name: "bar", inputSchema: { type: "object", properties: {} } }],
    });
    expect(valid).toBe(false);
  });

  it("rejects a pure tool missing the required name", () => {
    const { valid } = check({
      ...BASE,
      tools: [{ description: "No-name tool, long enough.", inputSchema: { type: "object", properties: {} } }],
    });
    expect(valid).toBe(false);
  });

  it("rejects a pure tool missing the required inputSchema", () => {
    const { valid } = check({ ...BASE, tools: [{ name: "t_ping", description: "No input schema, long." }] });
    expect(valid).toBe(false);
  });
});
