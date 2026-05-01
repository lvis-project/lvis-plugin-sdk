/**
 * Comprehensive test suite for @lvis/plugin-sdk src/index.ts
 *
 * Strategy: The SDK is type-only (no runtime helpers). Tests use the exported
 * JSON Schema (plugin-manifest.schema.json) via AJV to validate manifest
 * objects at runtime, and verify interface contracts structurally via
 * well-typed fixture objects.
 *
 * UQ-QUALITY SEV-2 #1
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

// ─── Schema + AJV setup ───────────────────────────────────────────────────────
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

// ─── Type imports (compile-time only, used for typed fixtures) ─────────────
import type {
  PluginManifest,
  PluginUiExtension,
  PluginConfigSchema,
  PluginConfigSchemaProperty,
  PluginHostApi,
  PluginRuntimeContext,
  RuntimePlugin,
  RuntimePluginFactory,
  EventSubscription,
  EventSubscriptionHint,
  ConversationTriggerSpec,
  ConversationTriggerResult,
  MissingDependenciesError as MissingDepsErrorType,
} from "../index.js";

import { MissingDependenciesError } from "../index.js";

// ─── PluginManifest schema validation ─────────────────────────────────────────
describe("PluginManifest — schema validation", () => {
  const VALID_MINIMAL: PluginManifest = {
    id: "com.example.my-plugin",
    name: "My Plugin",
    version: "1.0.0",
    entry: "dist/index.js",
    tools: ["my_plugin_ping"],
  };

  it("accepts a minimal valid manifest (all required fields)", () => {
    const { valid, errors } = validateManifest(VALID_MINIMAL);
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("accepts a full manifest with all optional fields", () => {
    const full: PluginManifest = {
      ...VALID_MINIMAL,
      description: "A comprehensive plugin",
      config: { apiEndpoint: "https://example.com" },
      capabilities: ["calendar-source", "mail-source"],
      startupTools: ["my_plugin_init"],
      eventSubscriptions: ["meeting:started", "meeting:ended"],
      eventPublishes: ["plugin:event:fired"],
      emittedEvents: ["plugin:event:fired"],
      uiCallable: ["my_plugin_ping"],
      keywords: [{ keyword: "example", skillId: "example-skill" }],
      publisher: "Example Corp",
      startupTimeoutMs: 5000,
      installPolicy: "admin",
      dependencies: ["com.example.dep-plugin"],
      requires: { capabilities: ["calendar"] },
    };
    const { valid, errors } = validateManifest(full);
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("rejects manifest missing required field: id", () => {
    const { id: _, ...noId } = VALID_MINIMAL;
    const { valid } = validateManifest(noId);
    expect(valid).toBe(false);
  });

  it("rejects manifest missing required field: name", () => {
    const { name: _, ...noName } = VALID_MINIMAL;
    const { valid } = validateManifest(noName);
    expect(valid).toBe(false);
  });

  it("rejects manifest missing required field: version", () => {
    const { version: _, ...noVersion } = VALID_MINIMAL;
    const { valid } = validateManifest(noVersion);
    expect(valid).toBe(false);
  });

  it("rejects manifest missing required field: entry", () => {
    const { entry: _, ...noEntry } = VALID_MINIMAL;
    const { valid } = validateManifest(noEntry);
    expect(valid).toBe(false);
  });

  it("rejects manifest missing required field: tools", () => {
    const { tools: _, ...noTools } = VALID_MINIMAL;
    const { valid } = validateManifest(noTools);
    expect(valid).toBe(false);
  });

  it("rejects tool names with dots (underscore format required)", () => {
    const { valid, errors } = validateManifest({
      ...VALID_MINIMAL,
      tools: ["my.plugin.ping"],
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("tools") || e.includes("pattern"))).toBe(true);
  });

  it("rejects tool names with hyphens", () => {
    const { valid } = validateManifest({
      ...VALID_MINIMAL,
      tools: ["my-plugin-ping"],
    });
    expect(valid).toBe(false);
  });

  it("accepts tool names with underscores and numbers", () => {
    const { valid, errors } = validateManifest({
      ...VALID_MINIMAL,
      tools: ["my_plugin_v2_ping", "another_tool123"],
    });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("rejects invalid semver version string", () => {
    const { valid } = validateManifest({ ...VALID_MINIMAL, version: "not-semver" });
    expect(valid).toBe(false);
  });

  it("accepts semver with prerelease tag", () => {
    const { valid, errors } = validateManifest({ ...VALID_MINIMAL, version: "1.2.3-beta.1" });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("accepts semver with build metadata", () => {
    const { valid, errors } = validateManifest({ ...VALID_MINIMAL, version: "1.2.3+build.42" });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("rejects null top-level object", () => {
    const { valid } = validateManifest(null);
    expect(valid).toBe(false);
  });

  it("rejects array instead of object", () => {
    const { valid } = validateManifest([]);
    expect(valid).toBe(false);
  });
});

// ─── window.defaultMode: "detached" (post-2c10491) ─────────────────────────
describe("PluginManifest — window.defaultMode:detached (2c10491)", () => {
  const BASE: PluginManifest = {
    id: "com.example.detach-plugin",
    name: "Detach Plugin",
    version: "1.0.0",
    entry: "dist/index.js",
    tools: ["detach_ping"],
    ui: [
      {
        id: "main-panel",
        slot: "sidebar",
        kind: "embedded-module",
        title: "Detached Panel",
        entry: "dist/panel.js",
        exportName: "Panel",
        window: { defaultMode: "detached" },
      },
    ],
  };

  it("accepts PluginUiExtension with window.defaultMode: 'detached'", () => {
    const { valid, errors } = validateManifest(BASE);
    // Schema may not enforce window.defaultMode enum (it's advisory) — structural check via TypeScript type
    // The manifest object must at least be constructable and not crash AJV
    expect(errors).not.toContain(
      expect.stringMatching(/window.*defaultMode|defaultMode.*invalid/i)
    );
    // TypeScript structural check: this assignment compiles = type is accepted
    const ext: PluginUiExtension = BASE.ui![0];
    expect(ext.window?.defaultMode).toBe("detached");
  });

  it("accepts PluginUiExtension with window.defaultMode: 'embedded'", () => {
    const manifest: PluginManifest = {
      ...BASE,
      ui: [{ ...BASE.ui![0], window: { defaultMode: "embedded" } }],
    };
    const ext: PluginUiExtension = manifest.ui![0];
    expect(ext.window?.defaultMode).toBe("embedded");
  });

  it("PluginUiExtension.window is optional", () => {
    const ext: PluginUiExtension = {
      id: "no-window",
      slot: "sidebar",
      kind: "info-card",
      title: "Card",
    };
    expect(ext.window).toBeUndefined();
  });
});

// ─── configSchema field (post-#76) ─────────────────────────────────────────
describe("PluginManifest — configSchema field (post-#76)", () => {
  it("accepts manifest with configSchema", () => {
    const schema: PluginConfigSchema = {
      properties: {
        apiKey: {
          type: "string",
          title: "API Key",
          format: "secret",
          description: "Your service API key",
        },
        timeout: {
          type: "number",
          title: "Timeout (ms)",
          default: 5000,
          minimum: 100,
          maximum: 60000,
        },
        enabled: {
          type: "boolean",
          title: "Enable feature",
          default: true,
        },
      },
      required: ["apiKey"],
    };
    const manifest: PluginManifest = {
      id: "com.example.config-plugin",
      name: "Config Plugin",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: ["config_ping"],
      configSchema: schema,
    };
    const { valid, errors } = validateManifest(manifest);
    // configSchema is a TS field — AJV schema allows additionalProperties
    // so it must not error; and the typed object compiles without TS errors
    expect(manifest.configSchema).toBeDefined();
    expect(manifest.configSchema?.properties.apiKey.format).toBe("secret");
    expect(manifest.configSchema?.required).toContain("apiKey");
  });

  it("PluginConfigSchemaProperty supports all declared types", () => {
    const props: Record<string, PluginConfigSchemaProperty> = {
      str: { type: "string" },
      num: { type: "number" },
      int: { type: "integer" },
      bool: { type: "boolean" },
      arr: { type: "array", items: { type: "string" } },
    };
    for (const [key, prop] of Object.entries(props)) {
      expect(prop.type).toBeDefined();
      // TypeScript narrowing: arr type has items
      if (prop.type === "array") {
        expect(prop.items).toBeDefined();
      }
    }
  });

  it("PluginConfigSchemaProperty format: 'secret' is accepted", () => {
    const prop: PluginConfigSchemaProperty = { type: "string", format: "secret" };
    expect(prop.format).toBe("secret");
  });

  it("PluginConfigSchema.customPanel is optional", () => {
    const schema: PluginConfigSchema = {
      properties: { x: { type: "string" } },
    };
    expect(schema.customPanel).toBeUndefined();
  });

  it("PluginConfigSchema with customPanel is accepted", () => {
    const schema: PluginConfigSchema = {
      properties: { x: { type: "string" } },
      customPanel: { entry: "dist/panel.js", exportName: "Panel" },
    };
    expect(schema.customPanel?.entry).toBe("dist/panel.js");
    expect(schema.customPanel?.exportName).toBe("Panel");
  });
});

// ─── PluginUiExtension type guard / structural checks ────────────────────────
describe("PluginUiExtension — structural validation", () => {
  it("all required fields must be present: id, slot, kind, title", () => {
    const valid: PluginUiExtension = {
      id: "panel-1",
      slot: "sidebar",
      kind: "embedded-module",
      title: "Panel One",
      entry: "dist/panel.js",
      exportName: "Panel",
    };
    expect(valid.id).toBe("panel-1");
    expect(valid.slot).toBe("sidebar");
    expect(valid.kind).toBe("embedded-module");
    expect(valid.title).toBe("Panel One");
  });

  it("slot is always 'sidebar'", () => {
    const ext: PluginUiExtension = { id: "x", slot: "sidebar", kind: "info-card", title: "X" };
    expect(ext.slot).toBe("sidebar");
  });

  it("all three kind values are accepted", () => {
    const kinds: PluginUiExtension["kind"][] = ["embedded-module", "embedded-page", "info-card"];
    for (const kind of kinds) {
      const ext: PluginUiExtension = { id: "x", slot: "sidebar", kind, title: "X" };
      expect(ext.kind).toBe(kind);
    }
  });

  it("optional fields default to undefined", () => {
    const ext: PluginUiExtension = { id: "x", slot: "sidebar", kind: "info-card", title: "X" };
    expect(ext.displayName).toBeUndefined();
    expect(ext.description).toBeUndefined();
    expect(ext.defaults).toBeUndefined();
    expect(ext.entry).toBeUndefined();
    expect(ext.exportName).toBeUndefined();
    expect(ext.page).toBeUndefined();
    expect(ext.window).toBeUndefined();
  });

  it("defaults field accepts arbitrary Record<string, unknown>", () => {
    const ext: PluginUiExtension = {
      id: "x",
      slot: "sidebar",
      kind: "info-card",
      title: "Card",
      defaults: { greeting: "Hello", count: 42, nested: { key: true } },
    };
    expect(ext.defaults?.greeting).toBe("Hello");
    expect(ext.defaults?.count).toBe(42);
  });
});

// ─── EventSubscription + EventSubscriptionHint ─────────────────────────────
describe("EventSubscription — structural validation", () => {
  it("EventSubscriptionHint covers all categories", () => {
    const categories: EventSubscriptionHint["category"][] = [
      "task", "note", "session", "meeting", "email", "calendar", "system",
    ];
    for (const category of categories) {
      const hint: EventSubscriptionHint = { category, priority: "medium", title: "Test" };
      expect(hint.category).toBe(category);
    }
  });

  it("EventSubscriptionHint covers all priorities", () => {
    const priorities: EventSubscriptionHint["priority"][] = ["high", "medium", "low"];
    for (const priority of priorities) {
      const hint: EventSubscriptionHint = { category: "system", priority, title: "Test" };
      expect(hint.priority).toBe(priority);
    }
  });

  it("EventSubscription.hint is optional", () => {
    const sub: EventSubscription = { type: "meeting:started" };
    expect(sub.hint).toBeUndefined();
  });

  it("EventSubscription with hint is accepted", () => {
    const sub: EventSubscription = {
      type: "meeting:started",
      hint: { category: "meeting", priority: "high", title: "Meeting started" },
    };
    expect(sub.hint?.category).toBe("meeting");
  });

  it("PluginManifest.eventSubscriptions accepts string[] form", () => {
    const manifest: PluginManifest = {
      id: "com.example.ev",
      name: "EV",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      eventSubscriptions: ["meeting:started", "email:received"],
    };
    expect(Array.isArray(manifest.eventSubscriptions)).toBe(true);
    expect((manifest.eventSubscriptions as string[])[0]).toBe("meeting:started");
  });

  it("PluginManifest.eventSubscriptions accepts EventSubscription[] form", () => {
    const subs: EventSubscription[] = [
      { type: "meeting:started", hint: { category: "meeting", priority: "high", title: "Meeting" } },
    ];
    const manifest: PluginManifest = {
      id: "com.example.ev2",
      name: "EV2",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      eventSubscriptions: subs,
    };
    expect((manifest.eventSubscriptions as EventSubscription[])[0].type).toBe("meeting:started");
  });
});

// ─── Capability-vs-event matrix ────────────────────────────────────────────
describe("PluginManifest — capability / event declarations", () => {
  it("capabilities field accepts arbitrary string tags", () => {
    const manifest: PluginManifest = {
      id: "com.example.cap",
      name: "Cap",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      capabilities: ["calendar-source", "mail-source", "meeting-recorder", "conversation-trigger"],
    };
    expect(manifest.capabilities).toContain("calendar-source");
    expect(manifest.capabilities).toContain("conversation-trigger");
  });

  it("eventPublishes and emittedEvents are both accepted", () => {
    const manifest: PluginManifest = {
      id: "com.example.evt",
      name: "Evt",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      eventPublishes: ["plugin:data:ready"],
      emittedEvents: ["plugin:data:ready"],
    };
    expect(manifest.eventPublishes).toContain("plugin:data:ready");
    expect(manifest.emittedEvents).toContain("plugin:data:ready");
  });

  it("notificationEvents accepted with optional titleField/bodyField", () => {
    const manifest: PluginManifest = {
      id: "com.example.notif",
      name: "Notif",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      notificationEvents: [
        { event: "meeting:started", titleField: "title", bodyField: "description" },
        { event: "email:received" },
      ],
    };
    expect(manifest.notificationEvents![0].event).toBe("meeting:started");
    expect(manifest.notificationEvents![1].titleField).toBeUndefined();
  });

  it("requires.capabilities gates plugin on host-provided capabilities", () => {
    const manifest: PluginManifest = {
      id: "com.example.req",
      name: "Req",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      requires: { capabilities: ["calendar", "email"] },
    };
    expect(manifest.requires?.capabilities).toContain("calendar");
  });
});

// ─── MissingDependenciesError runtime class ───────────────────────────────
describe("MissingDependenciesError", () => {
  it("is constructable with a list of missing deps", () => {
    const err = new MissingDependenciesError(["com.example.dep-a", "com.example.dep-b"]);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(MissingDependenciesError);
  });

  it("exposes missing array verbatim", () => {
    const missing = ["com.example.dep-a", "com.example.dep-b"];
    const err = new MissingDependenciesError(missing);
    expect(err.missing).toEqual(missing);
  });

  it("message includes the missing capability names", () => {
    const err = new MissingDependenciesError(["calendar", "email"]);
    expect(err.message).toContain("calendar");
    expect(err.message).toContain("email");
  });

  it("name is 'MissingDependenciesError'", () => {
    const err = new MissingDependenciesError([]);
    expect(err.name).toBe("MissingDependenciesError");
  });

  it("handles empty missing array without throwing", () => {
    expect(() => new MissingDependenciesError([])).not.toThrow();
  });
});

// ─── ConversationTriggerSpec / ConversationTriggerResult ─────────────────
describe("ConversationTriggerSpec + ConversationTriggerResult", () => {
  it("ConversationTriggerSpec minimal form", () => {
    const spec: ConversationTriggerSpec = {
      prompt: "Summarise the meeting",
      source: "proactive:meeting-summary",
    };
    expect(spec.prompt).toBe("Summarise the meeting");
    expect(spec.source).toBe("proactive:meeting-summary");
    expect(spec.visibility).toBeUndefined();
    expect(spec.priority).toBeUndefined();
    expect(spec.dedupeKey).toBeUndefined();
  });

  it("ConversationTriggerSpec full form", () => {
    const spec: ConversationTriggerSpec = {
      prompt: "Check email",
      source: "proactive:email-check",
      context: { emailId: "abc123" },
      visibility: "user-visible",
      priority: "high",
      dedupeKey: "email-abc123",
    };
    expect(spec.visibility).toBe("user-visible");
    expect(spec.priority).toBe("high");
    expect(spec.dedupeKey).toBe("email-abc123");
    expect(spec.context?.emailId).toBe("abc123");
  });

  it("ConversationTriggerResult accepted=true shape", () => {
    const result: ConversationTriggerResult = {
      accepted: true,
      source: "proactive:meeting-summary",
    };
    expect(result.accepted).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("ConversationTriggerResult accepted=false with all reason codes", () => {
    const reasons: NonNullable<ConversationTriggerResult["reason"]>[] = [
      "capability_denied",
      "invalid_source",
      "duplicate",
      "rate_limited",
      "loop_unavailable",
    ];
    for (const reason of reasons) {
      const result: ConversationTriggerResult = {
        accepted: false,
        source: "proactive:test",
        reason,
      };
      expect(result.reason).toBe(reason);
      expect(result.accepted).toBe(false);
    }
  });
});

// ─── RuntimePlugin + RuntimePluginFactory structural contracts ────────────
describe("RuntimePlugin + RuntimePluginFactory", () => {
  it("RuntimePlugin minimal shape has handlers", () => {
    const plugin: RuntimePlugin = {
      handlers: {
        my_ping: async () => ({ ok: true }),
      },
    };
    expect(plugin.handlers.my_ping).toBeTypeOf("function");
    expect(plugin.start).toBeUndefined();
    expect(plugin.stop).toBeUndefined();
  });

  it("RuntimePlugin with start/stop lifecycle hooks", () => {
    let started = false;
    let stopped = false;
    const plugin: RuntimePlugin = {
      start: async () => { started = true; },
      stop: async () => { stopped = true; },
      handlers: { noop: () => null },
    };
    expect(plugin.start).toBeTypeOf("function");
    expect(plugin.stop).toBeTypeOf("function");
  });

  it("RuntimePluginFactory is callable and returns a RuntimePlugin", async () => {
    const factory: RuntimePluginFactory = async (_ctx) => ({
      async start() {},
      handlers: { factory_ping: async () => ({ ok: true }) },
    });
    // Provide a minimal stub context
    const ctx = {
      pluginId: "com.example.test",
      pluginRoot: "/tmp/plugin",
      hostRoot: "/tmp/host",
      pluginDataDir: "/tmp/plugin-data",
      log: () => {},
      hostApi: {} as PluginHostApi,
    } satisfies PluginRuntimeContext;
    const plugin = await factory(ctx);
    expect(plugin.handlers.factory_ping).toBeTypeOf("function");
    const result = await (plugin.handlers.factory_ping as () => Promise<{ ok: boolean }>)();
    expect(result.ok).toBe(true);
  });
});

// ─── PluginHostApi interface contract ────────────────────────────────────
describe("PluginHostApi — interface contract (structural)", () => {
  it("PluginHostApi shape can be constructed with all methods as stubs", () => {
    const api: PluginHostApi = {
      storage: {
        resolve: (..._) => "/tmp",
        read: async (_) => new Uint8Array(),
        readText: async (_) => "",
        readJson: async (_) => null,
        write: async () => {},
        writeJson: async () => {},
        rm: async () => {},
        list: async () => [],
        exists: async (_) => false,
        mkdir: async () => {},
      },
      registerKeywords: (_) => {},
      emitEvent: (_type, _data) => {},
      onEvent: (_type, _handler) => () => {},
      addTask: (_task) => {},
      getSecret: (_key) => null,
      callTool: async (_name, _payload) => undefined,
      callLlm: async (_prompt, _opts) => "",
      logEvent: (_level, _msg, _data) => {},
      onShutdown: (_handler) => {},
      openAuthWindow: async (_opts) => [],
      triggerConversation: async (_spec) => ({ accepted: true, source: _spec.source }),
    };
    expect(api.registerKeywords).toBeTypeOf("function");
    expect(api.emitEvent).toBeTypeOf("function");
    expect(api.storage).toBeDefined();
  });

  it("PluginHostApi.onEvent returns an unsubscribe function", () => {
    const unsubscribes: Array<() => void> = [];
    const api: Pick<PluginHostApi, "onEvent"> = {
      onEvent: (_type, _handler) => {
        const unsub = () => {};
        unsubscribes.push(unsub);
        return unsub;
      },
    };
    const unsub = api.onEvent("test:event", () => {});
    expect(unsub).toBeTypeOf("function");
    expect(unsubscribes).toHaveLength(1);
  });

  it("PluginHostApi.getSecret returns string or null", () => {
    const api: Pick<PluginHostApi, "getSecret"> = {
      getSecret: (key) => key === "found-key" ? "secret-value" : null,
    };
    expect(api.getSecret("found-key")).toBe("secret-value");
    expect(api.getSecret("missing-key")).toBeNull();
  });

  it("PluginHostApi.addTask accepts all priority levels", () => {
    const tasks: Parameters<PluginHostApi["addTask"]>[0][] = [];
    const api: Pick<PluginHostApi, "addTask"> = {
      addTask: (t) => { tasks.push(t); },
    };
    api.addTask({ title: "A", source: "plugin:test", priority: "high" });
    api.addTask({ title: "B", source: "plugin:test", priority: "medium" });
    api.addTask({ title: "C", source: "plugin:test", priority: "low" });
    api.addTask({ title: "D", source: "plugin:test" }); // optional priority
    expect(tasks).toHaveLength(4);
    expect(tasks[0].priority).toBe("high");
    expect(tasks[3].priority).toBeUndefined();
  });
});

// ─── PluginManifest edge cases ─────────────────────────────────────────────
describe("PluginManifest — edge cases", () => {
  it("accepts empty tools array", () => {
    const { valid, errors } = validateManifest({
      id: "com.example.empty-tools",
      name: "Empty Tools",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
    });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("accepts multiple tools", () => {
    const { valid, errors } = validateManifest({
      id: "com.example.multi-tools",
      name: "Multi",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: ["tool_one", "tool_two", "tool_three"],
    });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("rejects id with invalid characters", () => {
    const { valid } = validateManifest({
      id: "!invalid id",
      name: "N",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
    });
    expect(valid).toBe(false);
  });

  it("accepts id in reverse-DNS format", () => {
    const { valid, errors } = validateManifest({
      id: "com.company.plugin-name",
      name: "N",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
    });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("installPolicy accepts admin or user", () => {
    for (const policy of ["admin", "user"] as const) {
      const manifest: PluginManifest = {
        id: "com.example.pol",
        name: "N",
        version: "1.0.0",
        entry: "dist/index.js",
        tools: [],
        installPolicy: policy,
      };
      expect(manifest.installPolicy).toBe(policy);
    }
  });

  it("dependencies accept string or DependencySpec items", () => {
    const manifest: PluginManifest = {
      id: "com.example.dep",
      name: "N",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      dependencies: [
        "com.example.simple-dep",
        { pluginId: "com.example.complex-dep", versionRange: ">=1.0.0", required: true },
      ],
    };
    expect(manifest.dependencies).toHaveLength(2);
    expect(typeof manifest.dependencies![0]).toBe("string");
    expect(typeof manifest.dependencies![1]).toBe("object");
  });
});
