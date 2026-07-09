/**
 * normalizeManifest — Plugin Contract v6 (#885) a2 unit tests.
 *
 * Mirrors the host's normalize cases (u1-sdk-v6.md §Tests "SDK unit"):
 *   legacy → pure with derived visibility + pathFields move + removed-field
 *   drop + single report; schema-less UI-only tool → ["app"] empty inputSchema;
 *   pure passthrough (no report); absent visibility → ["model","app"]
 *   materialization; explicit `[]` → throws; empty tools:[] → empty Tool[].
 */
import { describe, it, expect, vi } from "vitest";
import { normalizeManifest } from "../index.js";
import type {
  Tool,
  RawPluginManifest,
  NormalizedManifest,
  NormalizeNotice,
} from "../index.js";

// `isUiOnly` per SoT §2.3 — the downstream governed-vs-bypass discriminator
// that reads the normalized (always-present, non-empty) visibility array.
const isUiOnly = (t: Tool): boolean => {
  const vis = t._meta?.ui?.visibility ?? [];
  return vis.includes("app") && !vis.includes("model");
};

const BASE = {
  id: "ms-graph",
  name: "LVIS Microsoft 365",
  version: "0.3.38",
  entry: "dist/hostPlugin.js",
  description: "Microsoft Graph integration fixture for normalize tests.",
} as const;

// ─── Legacy → pure, ms-graph-shaped (dual + UI-only auth + model-only) ───────
describe("normalizeManifest — legacy → pure (ms-graph-shaped)", () => {
  // tools[] (model surface): a model-only tool (with pathFields + a removed
  // `category`), and two dual tools also present in uiActions.
  // uiActions adds the UI-only auth trio (status/auth/signout). signout is
  // deliberately schema-less to exercise the convergence case.
  const LEGACY: RawPluginManifest = {
    ...BASE,
    tools: ["msgraph_email_read", "msgraph_email_list", "msgraph_set_environment"],
    uiActions: {
      msgraph_email_list: {},
      msgraph_set_environment: {},
      msgraph_status: {},
      msgraph_auth: {},
      msgraph_signout: {},
    },
    auth: {
      statusTool: "msgraph_status",
      loginTool: "msgraph_auth",
      logoutTool: "msgraph_signout",
    },
    toolSchemas: {
      msgraph_email_read: {
        description: "Read one email body.",
        category: "read",
        pathFields: ["attachmentPath"],
        inputSchema: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
      msgraph_email_list: {
        description: "List inbox emails.",
        inputSchema: { type: "object", properties: {} },
      },
      msgraph_set_environment: {
        description: "Switch the active MS environment.",
        inputSchema: {
          type: "object",
          properties: { environment: { type: "string" } },
          required: ["environment"],
        },
      },
      msgraph_status: {
        description: "Return auth + watcher status.",
        inputSchema: { type: "object", properties: {} },
      },
      msgraph_auth: {
        description: "Log in to Microsoft.",
        inputSchema: { type: "object", properties: {} },
      },
      // msgraph_signout: intentionally absent (schema-less UI-only tool).
    },
  };

  it("produces the exact pure Tool[] with derived visibility + pathFields move", () => {
    const result = normalizeManifest(LEGACY);
    const expected: Tool[] = [
      {
        name: "msgraph_email_read",
        description: "Read one email body.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        _meta: {
          ui: { visibility: ["model"] },
          "xyz.lvis/pathFields": ["attachmentPath"],
        },
      },
      {
        name: "msgraph_email_list",
        description: "List inbox emails.",
        inputSchema: { type: "object", properties: {} },
        _meta: { ui: { visibility: ["model", "app"] } },
      },
      {
        name: "msgraph_set_environment",
        description: "Switch the active MS environment.",
        inputSchema: {
          type: "object",
          properties: { environment: { type: "string" } },
          required: ["environment"],
        },
        _meta: { ui: { visibility: ["model", "app"] } },
      },
      {
        name: "msgraph_status",
        description: "Return auth + watcher status.",
        inputSchema: { type: "object", properties: {} },
        _meta: { ui: { visibility: ["app"] } },
      },
      {
        name: "msgraph_auth",
        description: "Log in to Microsoft.",
        inputSchema: { type: "object", properties: {} },
        _meta: { ui: { visibility: ["app"] } },
      },
      {
        // schema-less UI-only tool: empty inputSchema, no description.
        name: "msgraph_signout",
        inputSchema: { type: "object", properties: {} },
        _meta: { ui: { visibility: ["app"] } },
      },
    ];
    expect(result.tools).toEqual(expected);
  });

  it("strips the legacy toolSchemas / uiActions maps from the output", () => {
    const result = normalizeManifest(LEGACY);
    expect(result).not.toHaveProperty("toolSchemas");
    expect(result).not.toHaveProperty("uiActions");
    // Non-legacy fields survive verbatim.
    expect(result.id).toBe("ms-graph");
    expect(result.auth).toEqual(LEGACY.auth);
  });

  it("covers the 3 reachable visibility rows (model-only / dual / app-only)", () => {
    const byName = new Map(normalizeManifest(LEGACY).tools.map((t) => [t.name, t]));
    expect(byName.get("msgraph_email_read")!._meta!.ui!.visibility).toEqual(["model"]);
    expect(byName.get("msgraph_email_list")!._meta!.ui!.visibility).toEqual(["model", "app"]);
    expect(byName.get("msgraph_status")!._meta!.ui!.visibility).toEqual(["app"]);
    // (model=false, app=false) is unreachable via a valid legacy manifest —
    // every allNames entry comes from tools[] or uiActions — but the internal
    // deriveVisibility throws on it as R6 defense-in-depth (not reachable here).
  });

  it("schema-less UI-only tool → ['app'] visibility, empty inputSchema, no description", () => {
    const signout = normalizeManifest(LEGACY).tools.find((t) => t.name === "msgraph_signout")!;
    expect(signout.inputSchema).toEqual({ type: "object", properties: {} });
    expect(signout.description).toBeUndefined();
    expect(signout._meta!.ui!.visibility).toEqual(["app"]);
  });

  it("drops removed fields and fires report once with the deduped droppedFields", () => {
    const notices: NormalizeNotice[] = [];
    const result = normalizeManifest(LEGACY, (n) => notices.push(n));
    // No Tool carries a removed field.
    for (const t of result.tools) {
      for (const f of ["category", "workerId", "writesToOwnSandbox", "version", "deprecatedSince", "replacedBy"]) {
        expect(t).not.toHaveProperty(f);
      }
    }
    expect(notices).toHaveLength(1);
    expect(notices[0]).toEqual({
      pluginId: "ms-graph",
      kind: "legacy-shape",
      droppedFields: ["category"],
    });
  });
});

// ─── report semantics ───────────────────────────────────────────────────────
describe("normalizeManifest — report semantics", () => {
  it("legacy manifest with no removed fields still fires report once (droppedFields [])", () => {
    const raw: RawPluginManifest = {
      ...BASE,
      id: "clean-legacy",
      tools: ["t_ping"],
      toolSchemas: {
        t_ping: { description: "Ping the plugin.", inputSchema: { type: "object", properties: {} } },
      },
    };
    const report = vi.fn();
    normalizeManifest(raw, report);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith({
      pluginId: "clean-legacy",
      kind: "legacy-shape",
      droppedFields: [],
    });
  });

  it("does NOT call report for a pure manifest", () => {
    const raw: RawPluginManifest = {
      ...BASE,
      id: "pure-plugin",
      tools: [
        {
          name: "p_ping",
          description: "Ping the plugin and return status.",
          inputSchema: { type: "object", properties: {} },
          _meta: { ui: { visibility: ["model"] } },
        },
      ],
    };
    const report = vi.fn();
    normalizeManifest(raw, report);
    expect(report).not.toHaveBeenCalled();
  });
});

// ─── pure passthrough + visibility materialization ──────────────────────────
describe("normalizeManifest — pure passthrough", () => {
  it("returns a pure manifest with explicit visibility unchanged (deep-equal)", () => {
    const raw: RawPluginManifest = {
      ...BASE,
      id: "pure-plugin",
      tools: [
        {
          name: "p_a",
          description: "Tool A does a thing.",
          inputSchema: { type: "object", properties: {} },
          _meta: { ui: { visibility: ["model"] } },
        },
        {
          name: "p_b",
          description: "Tool B does another thing.",
          inputSchema: { type: "object", properties: {} },
          _meta: { ui: { visibility: ["model", "app"] } },
        },
      ],
    };
    const result = normalizeManifest(raw);
    expect(result).toEqual(raw as unknown as NormalizedManifest);
  });

  it("materializes ['model','app'] when a pure tool omits _meta.ui.visibility", () => {
    const raw: RawPluginManifest = {
      ...BASE,
      id: "pure-plugin",
      tools: [
        {
          name: "p_no_vis",
          description: "Tool omitting visibility.",
          inputSchema: { type: "object", properties: {} },
          _meta: { ui: {} },
        },
      ],
    };
    const [tool] = normalizeManifest(raw).tools;
    expect(tool._meta!.ui!.visibility).toEqual(["model", "app"]);
  });

  it("materializes ['model','app'] when a pure tool omits _meta entirely", () => {
    const raw: RawPluginManifest = {
      ...BASE,
      id: "pure-plugin",
      tools: [
        {
          name: "p_no_meta",
          description: "Tool omitting _meta.",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    };
    const [tool] = normalizeManifest(raw).tools;
    expect(tool._meta!.ui!.visibility).toEqual(["model", "app"]);
  });

  it("fail-closed: the materialized default is never app-only (governed route)", () => {
    const raw: RawPluginManifest = {
      ...BASE,
      id: "pure-plugin",
      tools: [
        {
          name: "p_default",
          description: "Hand-authored tool that omitted visibility.",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    };
    const [tool] = normalizeManifest(raw).tools;
    expect(isUiOnly(tool)).toBe(false);
  });
});

// ─── R6 empty-visibility reject + empty tools ───────────────────────────────
describe("normalizeManifest — fail-closed edges", () => {
  it("throws on an explicit _meta.ui.visibility: [] (R6, never widened to dual)", () => {
    const raw: RawPluginManifest = {
      ...BASE,
      id: "pure-plugin",
      tools: [
        {
          name: "p_empty_vis",
          description: "Tool with an explicit empty visibility.",
          inputSchema: { type: "object", properties: {} },
          _meta: { ui: { visibility: [] } },
        },
      ],
    };
    expect(() => normalizeManifest(raw)).toThrow(/visibility is \[\]/);
  });

  it("empty tools:[] → legacy branch → empty Tool[], no throw", () => {
    const raw: RawPluginManifest = { ...BASE, id: "empty-plugin", tools: [] };
    const result = normalizeManifest(raw);
    expect(result.tools).toEqual([]);
  });
});
