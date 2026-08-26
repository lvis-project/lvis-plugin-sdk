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
import { LVIS_EXTENSION_NAMESPACE } from "../index.js";
import { agentPluginsDocument } from "./agent-plugins-document.js";

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
  return checkDocument(agentPluginsDocument(obj));
}

/** Same gate, for a case that needs to place a field on the document itself. */
function checkDocument(document: unknown): ReturnType<typeof check> {
  const valid = validate(document) as boolean;
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

const pureTool = (
  over: Record<string, unknown> = {},
): Record<string, unknown> & { _meta: Record<string, unknown> } => ({
  name: "t_ping",
  description: "Ping tool that returns a status object.",
  inputSchema: { type: "object", properties: {} },
  _meta: { ui: { visibility: ["model", "app"] } },
  ...over,
});

const validFirstTask = {
  priority: 10,
  locales: {
    en: {
      headline: "Try the plugin",
      body: "Prefill a visible prompt without invoking a tool.",
      actionLabel: "Prefill",
      composerPrompt: "Help me use this plugin",
    },
  },
};

describe("plugin-manifest schema (v6) — compiles + validates", () => {
  it("the mirrored schema compiles under the host's AJV options without throwing", () => {
    expect(() => compileSchema()).not.toThrow();
  });

  it("rejects terminal CR/LF in format-constrained manifest fields", () => {
    expect(check({ ...BASE, id: "ms-graph\n" }).valid).toBe(false);
    expect(check({
      ...BASE,
      requires: { minAppVersion: "1.0.0\r" },
    }).valid).toBe(false);
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

  it("accepts a complete inert onboarding first-task declaration", () => {
    const { valid, errors } = check({
      ...BASE,
      tools: [],
      onboarding: { firstTask: validFirstTask },
    });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("rejects retired ui[] detached-window hints", () => {
    const { valid, rawErrors } = check({
      ...BASE,
      tools: [],
      ui: [
        {
          id: "main",
          slot: "sidebar",
          kind: "embedded-page",
          title: "Main",
          page: "main",
          window: { width: 640 },
        },
      ],
    });
    expect(valid).toBe(false);
    expect(rawErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "additionalProperties",
          params: expect.objectContaining({ additionalProperty: "window" }),
        }),
      ]),
    );
  });

  it.each([
    ["missing priority", { locales: validFirstTask.locales }],
    ["missing English fallback", {
      ...validFirstTask,
      locales: { ko: validFirstTask.locales.en },
    }],
    ["invalid locale key", {
      ...validFirstTask,
      locales: { ...validFirstTask.locales, en_US: validFirstTask.locales.en },
    }],
    ["oversized locale key", {
      ...validFirstTask,
      locales: {
        ...validFirstTask.locales,
        [`en-${"segment-".repeat(5)}us`]: validFirstTask.locales.en,
      },
    }],
    ["out-of-range priority", { ...validFirstTask, priority: 1001 }],
    ["executable field", { ...validFirstTask, autoSubmit: true }],
    ["incomplete copy", {
      ...validFirstTask,
      locales: { en: { headline: "Incomplete" } },
    }],
    ["oversized composer prompt", {
      ...validFirstTask,
      locales: {
        en: { ...validFirstTask.locales.en, composerPrompt: "x".repeat(513) },
      },
    }],
  ])("rejects malformed onboarding: %s", (_name, firstTask) => {
    expect(check({
      ...BASE,
      tools: [],
      onboarding: { firstTask },
    }).valid).toBe(false);
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

  it("accepts explicit bundled contributions and colocated operation restrictions", () => {
    const readTool = pureTool({
      name: "attendance_read",
      inputSchema: {
        type: "object",
        properties: { operation: { type: "string", enum: ["today"] } },
        required: ["operation"],
        additionalProperties: false,
      },
    });
    const writeTool = pureTool({
      name: "attendance_write",
      inputSchema: {
        type: "object",
        properties: { operation: { type: "string", enum: ["clock"] } },
        required: ["operation"],
        additionalProperties: false,
      },
    });
    readTool._meta = {
      ...readTool._meta,
      "lvisai/operationPolicy": {
        discriminant: "operation",
        operations: {
          today: {
            kind: "read",
            minimumRisk: "read",
            appVisible: true,
            successfulResultStatuses: ["success"],
          },
        },
      },
    };
    writeTool._meta = {
      ...writeTool._meta,
      "lvisai/operationPolicy": {
        discriminant: "operation",
        operations: {
          clock: {
            kind: "write",
            minimumRisk: "network",
            appVisible: true,
            requiresRead: {
              tool: "attendance_read",
              operations: ["today"],
              maxAgeMs: 60_000,
            },
          },
        },
      },
    };
    const { valid, errors } = check({
      ...BASE,
      tools: [readTool, writeTool],
      skills: [{ id: "attendance", path: "skills/attendance" }],
      hooks: [{ id: "audit_hook", path: "hooks/audit.json" }],
      mcpServers: [{ id: "attendance_mcp", path: "mcp/attendance.json" }],
    });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("rejects an empty successful-result status contract", () => {
    const readTool = pureTool();
    readTool._meta = {
      ...readTool._meta,
      "lvisai/operationPolicy": {
        discriminant: "operation",
        operations: {
          ping: {
            kind: "read",
            minimumRisk: "read",
            successfulResultStatuses: [],
          },
        },
      },
    };
    expect(check({ ...BASE, tools: [readTool] }).valid).toBe(false);
  });

  it("rejects contribution metadata outside the strict id/path declaration", () => {
    const { valid, rawErrors } = check({
      ...BASE,
      tools: [],
      skills: [{ id: "attendance", path: "skills/attendance", trusted: true }],
    });
    expect(valid).toBe(false);
    expect(rawErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        keyword: "additionalProperties",
        params: expect.objectContaining({ additionalProperty: "trusted" }),
      }),
    ]));
  });

  it("rejects removed appAllowed policy and undeclared operation-rule fields", () => {
    const policyTool = pureTool();
    policyTool._meta = {
      ...policyTool._meta,
      "lvisai/operationPolicy": {
        discriminant: "operation",
        appAllowed: ["ping"],
        operations: {
          ping: { kind: "read", minimumRisk: "read" },
        },
      },
    };
    const policyResult = check({
      ...BASE,
      tools: [policyTool],
    });
    expect(policyResult.valid).toBe(false);
    expect(policyResult.rawErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        keyword: "additionalProperties",
        params: expect.objectContaining({ additionalProperty: "appAllowed" }),
      }),
    ]));

    const ruleTool = pureTool();
    ruleTool._meta = {
      ...ruleTool._meta,
      "lvisai/operationPolicy": {
        discriminant: "operation",
        operations: {
          ping: { kind: "read", minimumRisk: "read", confirmed: true },
        },
      },
    };
    expect(check({
      ...BASE,
      tools: [ruleTool],
    }).valid).toBe(false);
  });

  it("rejects retired parallel top-level UI and operation policy fields", () => {
    for (const field of [
      "uiTool",
      "uiTools",
      "uiAction",
      "uiActions",
      "operationGovernance",
    ]) {
      const { valid, rawErrors } = check({
        ...BASE,
        tools: [pureTool()],
        [field]: {},
      });
      expect(valid, field).toBe(false);
      expect(rawErrors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          keyword: "additionalProperties",
          params: expect.objectContaining({ additionalProperty: field }),
        }),
      ]));
    }
  });

  // Agent Plugins 1.0.0 introduced a *portable* top-level `keywords` (catalog
  // tags, string[]) that collides by name with the retired LVIS field (an array
  // of keyword-to-Tool preload records). An author migrating the old contract
  // has two places to put it and both have to refuse it, so both are measured.
  it("rejects the retired keyword-to-Tool preload contract in the LVIS namespace", () => {
    const document = agentPluginsDocument({ ...BASE, tools: [pureTool()] }) as {
      extensions: Record<string, Record<string, unknown>>;
    };
    document.extensions[LVIS_EXTENSION_NAMESPACE].keywords = [
      { keyword: "ping", skillId: "t_ping" },
    ];
    const { valid, rawErrors } = checkDocument(document);
    expect(valid).toBe(false);
    expect(rawErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        keyword: "additionalProperties",
        params: expect.objectContaining({ additionalProperty: "keywords" }),
      }),
    ]));
  });

  it("rejects the retired keyword records in the portable keywords slot", () => {
    const { valid, errors } = check({
      ...BASE,
      tools: [pureTool()],
      keywords: [{ keyword: "ping", skillId: "t_ping" }],
    });
    expect(valid).toBe(false);
    expect(errors.join(" ")).toContain("/keywords/0");
  });

  // The portable half of the document belongs to Agent Plugins 1.0.0, not to
  // LVIS. Nothing else in this file reaches it, so without these the gate only
  // covers the namespace and would let a malformed spec block through.
  it("accepts the portable metadata block in its spec shape", () => {
    const document = agentPluginsDocument({ ...BASE, tools: [pureTool()] }) as Record<string, unknown>;
    Object.assign(document, {
      author: { name: "Example Maintainer", email: "maintainer@example.com", url: "https://example.com" },
      homepage: "https://example.com/plugin",
      repository: "https://github.com/example/plugin",
      license: "MIT",
      keywords: ["email"],
    });
    const { valid, errors } = checkDocument(document);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  // The portable strings are bounded too. The flat `author` this object
  // replaced was capped at 256 characters, so an object of unbounded strings
  // would be strictly looser than what it replaced -- and this manifest is
  // rendered in the catalog and in editor intellisense.
  it.each([
    ["author.name over 256", (d: Record<string, unknown>) => {
      d.author = { name: "x".repeat(257) };
    }],
    ["author.email over 254", (d: Record<string, unknown>) => {
      d.author = { name: "M", email: `${"x".repeat(250)}@example.com` };
    }],
    ["homepage over 2048", (d: Record<string, unknown>) => {
      d.homepage = `https://example.com/${"x".repeat(2048)}`;
    }],
    ["license over 64", (d: Record<string, unknown>) => {
      d.license = "x".repeat(65);
    }],
    ["a keyword over 64", (d: Record<string, unknown>) => {
      d.keywords = ["x".repeat(65)];
    }],
    ["more than 32 keywords", (d: Record<string, unknown>) => {
      d.keywords = Array.from({ length: 33 }, (_unused, index) => `k${index}`);
    }],
    ["a newline in the portable half", (d: Record<string, unknown>) => {
      d.license = "MIT\nEvil";
    }],
  ])("rejects %s", (_label, mutate) => {
    const document = agentPluginsDocument({ ...BASE, tools: [pureTool()] }) as Record<
      string,
      unknown
    >;
    mutate(document);
    expect(checkDocument(document).valid).toBe(false);
  });

  it("rejects author as a bare string (pre-1.0.0 shape)", () => {
    const { valid, errors } = check({ ...BASE, tools: [pureTool()], author: "Example Maintainer" });
    expect(valid).toBe(false);
    expect(errors.join(" ")).toContain("/author");
  });

  it("rejects an unknown key inside the portable author object", () => {
    const document = agentPluginsDocument({ ...BASE, tools: [pureTool()] }) as Record<string, unknown>;
    document.author = { name: "Example Maintainer", github: "example" };
    const { valid, rawErrors } = checkDocument(document);
    expect(valid).toBe(false);
    expect(rawErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        keyword: "additionalProperties",
        params: expect.objectContaining({ additionalProperty: "github" }),
      }),
    ]));
  });

  it("rejects a document whose $schema is not the 1.0.0 schema URL", () => {
    const document = agentPluginsDocument({ ...BASE, tools: [pureTool()] }) as Record<string, unknown>;
    document.$schema = "https://agent-plugins.org/schemas/0.9.0/plugin.schema.json";
    expect(checkDocument(document).valid).toBe(false);
  });

  it("rejects a foreign extension namespace that is not an object", () => {
    const document = agentPluginsDocument({ ...BASE, tools: [pureTool()] }) as {
      extensions: Record<string, unknown>;
    };
    document.extensions["com.example.other"] = "not-an-object";
    expect(checkDocument(document).valid).toBe(false);
  });

  it("accepts a foreign extension namespace alongside the LVIS one", () => {
    const document = agentPluginsDocument({ ...BASE, tools: [pureTool()] }) as {
      extensions: Record<string, unknown>;
    };
    document.extensions["com.example.other"] = { anything: true };
    const { valid, errors } = checkDocument(document);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  it("accepts the portable keywords slot used as the spec defines it", () => {
    const { valid, errors } = check({ ...BASE, tools: [pureTool()], keywords: ["email", "calendar"] });
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
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
