/**
 * normalizeManifest — Plugin Contract v6 pure Tool[] unit tests.
 *
 * The host SoT accepts only MCP Tool objects. Visibility is materialized when
 * omitted and explicit empty visibility fails closed; legacy string-tool maps
 * are intentionally not normalized for compatibility.
 */
import { describe, expect, it } from "vitest";
import { normalizeManifest } from "../index.js";
import type { NormalizeNotice, PluginManifest, RawPluginManifest, Tool } from "../index.js";

const BASE: Omit<PluginManifest, "tools"> = {
  id: "ms-graph",
  name: "LVIS Microsoft 365",
  version: "6.0.0",
  entry: "dist/hostPlugin.js",
  description: "Microsoft Graph integration fixture for normalize tests.",
};

const tool = (name: string, visibility?: Array<"model" | "app">): Tool => ({
  name,
  description: `Run ${name}.`,
  inputSchema: { type: "object", properties: {} },
  ...(visibility === undefined ? {} : { _meta: { ui: { visibility } } }),
});

describe("normalizeManifest — v6 pure Tool[] contract", () => {
  it("converts a schema-valid legacy manifest without corrupting tool names", () => {
    const legacy: RawPluginManifest = {
      ...BASE,
      tools: ["legacy_read"],
      uiActions: { legacy_status: {} },
      toolSchemas: {
        legacy_read: {
          description: "Read legacy data.",
          pathFields: ["attachmentPath"],
          category: "read",
          inputSchema: {
            type: "object",
            properties: { attachmentPath: { type: "string" } },
          },
        },
        legacy_status: {
          description: "Read legacy status.",
          inputSchema: { type: "object", properties: {} },
        },
      },
    };
    const notices: NormalizeNotice[] = [];

    const result = normalizeManifest(legacy, (notice) => notices.push(notice));

    expect(result).not.toHaveProperty("toolSchemas");
    expect(result).not.toHaveProperty("uiActions");
    expect(result.tools).toEqual([
      {
        name: "legacy_read",
        description: "Read legacy data.",
        inputSchema: {
          type: "object",
          properties: { attachmentPath: { type: "string" } },
        },
        _meta: {
          ui: { visibility: ["model"] },
          "xyz.lvis/pathFields": ["attachmentPath"],
        },
      },
      {
        name: "legacy_status",
        description: "Read legacy status.",
        inputSchema: { type: "object", properties: {} },
        _meta: { ui: { visibility: ["app"] } },
      },
    ]);
    expect(notices).toEqual([
      { pluginId: "ms-graph", kind: "legacy-shape", droppedFields: ["category"] },
    ]);
  });

  it("preserves explicit model, dual, and app visibility", () => {
    const manifest: PluginManifest = {
      ...BASE,
      tools: [
        tool("model_only", ["model"]),
        tool("dual", ["model", "app"]),
        tool("app_only", ["app"]),
      ],
    };

    expect(normalizeManifest(manifest)).toEqual(manifest);
  });

  it("materializes dual visibility when metadata or visibility is omitted", () => {
    const manifest: PluginManifest = {
      ...BASE,
      tools: [
        tool("without_meta"),
        {
          ...tool("without_visibility"),
          _meta: { ui: {} },
        },
      ],
    };

    const result = normalizeManifest(manifest);
    expect(result.tools.map((entry) => entry._meta?.ui?.visibility)).toEqual([
      ["model", "app"],
      ["model", "app"],
    ]);
    expect(manifest.tools[0]._meta).toBeUndefined();
    expect(manifest.tools[1]._meta?.ui?.visibility).toBeUndefined();
  });

  it("fails closed when visibility is explicitly empty", () => {
    const manifest: PluginManifest = {
      ...BASE,
      tools: [tool("unreachable", [])],
    };

    expect(() => normalizeManifest(manifest)).toThrow(/visibility is \[\]/);
  });

  it("keeps an empty pure Tool list empty", () => {
    expect(normalizeManifest({ ...BASE, tools: [] }).tools).toEqual([]);
  });
});
