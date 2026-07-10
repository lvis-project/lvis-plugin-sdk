/**
 * Manifest JSON-schema — Plugin Contract v6 (#885) a2 unit tests.
 *
 * Compiles the canonical schema via `compileManifestValidator()` (the SDK's
 * AJV strict:true builder — the SAME construction the host reuses) so this
 * suite doubles as the hard gate that the v6 `oneOf` + `#/definitions/tool`
 * schema compiles without throwing. Cases mirror u1-sdk-v6.md §Tests
 * "SDK schema unit".
 */
import { describe, it, expect, beforeAll } from "vitest";
import { compileManifestValidator } from "../index.js";
import type { ValidateFunction } from "ajv";

let validate: ValidateFunction;

beforeAll(() => {
  // Hard gate: this MUST NOT throw (the v6 oneOf/definitions schema compiles
  // cleanly under AJV strict:true).
  validate = compileManifestValidator();
});

function check(obj: unknown): { valid: boolean; errors: string[] } {
  const valid = validate(obj) as boolean;
  const errors = valid
    ? []
    : (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`);
  return { valid, errors };
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
  it("compileManifestValidator() compiles the v6 schema without throwing", () => {
    expect(() => compileManifestValidator()).not.toThrow();
  });

  // ── accepts ────────────────────────────────────────────────────────────
  it("accepts a full pure manifest (ms-graph migrated shape)", () => {
    const manifest = {
      ...BASE,
      tools: [
        pureTool({ name: "msgraph_email_list", _meta: { ui: { visibility: ["model", "app"] } } }),
        pureTool({
          name: "msgraph_email_read",
          _meta: { ui: { visibility: ["model"] }, "xyz.lvis/pathFields": ["attachmentPath"] },
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

  it("rejects an unknown _meta key (xyz.lvis/category)", () => {
    const bad = pureTool({ _meta: { ui: { visibility: ["model"] }, "xyz.lvis/category": "read" } });
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
