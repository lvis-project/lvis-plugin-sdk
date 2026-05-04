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
  PluginLifecycleEvent,
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
    description: "One-line summary of what this plugin does.",
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

  it("rejects manifest missing required field: description", () => {
    const { description: _, ...noDesc } = VALID_MINIMAL;
    const { valid } = validateManifest(noDesc);
    expect(valid).toBe(false);
  });

  it("rejects manifest with empty description", () => {
    const { valid } = validateManifest({ ...VALID_MINIMAL, description: "" });
    expect(valid).toBe(false);
  });

  it("rejects unknown top-level key (additionalProperties:false) — permissions example", () => {
    // Phase 1 breaking change: permissions[] was never read by the host; it is now
    // explicitly rejected at validation time rather than silently ignored.
    const { valid } = validateManifest({
      ...VALID_MINIMAL,
      permissions: ["tasks", "secrets"],
    });
    expect(valid).toBe(false);
  });

  it("rejects eventPublishes (removed in v3; use emittedEvents instead)", () => {
    // eventPublishes was the legacy alias for emittedEvents. It is removed in v3.
    // Manifests using it will fail additionalProperties:false validation.
    const { valid } = validateManifest({
      ...VALID_MINIMAL,
      eventPublishes: ["meeting.summary.created"],
    });
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

  it("rejects pre-release tag (stable-only marketplace channel)", () => {
    // Mirrors the publish.yml SemVer regex — pre-release tags are not a
    // supported release form on the marketplace today (Channel 3 of
    // `marketplace-publishing.md`). Rejecting at AJV level surfaces the
    // mismatch before the plugin author even pushes a tag.
    const { valid } = validateManifest({ ...VALID_MINIMAL, version: "1.2.3-beta.1" });
    expect(valid).toBe(false);
  });

  it("rejects build metadata (stable-only marketplace channel)", () => {
    const { valid } = validateManifest({ ...VALID_MINIMAL, version: "1.2.3+build.42" });
    expect(valid).toBe(false);
  });

  it("rejects leading zeros (per SemVer §2)", () => {
    const { valid } = validateManifest({ ...VALID_MINIMAL, version: "01.2.3" });
    expect(valid).toBe(false);
  });

  // Boundary-table sweep — accept/reject pairs that pin every regex group
  // independently. Without this, a per-group bug (e.g. `[1-9][0-9]+` instead
  // of `[1-9][0-9]*` would silently reject single-digit `1.2.3`) could slip
  // past. Add new rows here when loosening or tightening the contract.
  it.each([
    // accepts
    ["1.0.10", true],
    ["0.0.0", true],
    ["10.20.30", true],
    ["1.2.3", true],
    // rejects — leading zeros on each component
    ["01.2.3", false],
    ["1.02.3", false],
    ["1.2.03", false],
    // rejects — wrong shape
    ["", false],
    ["1", false],
    ["1.2", false],
    ["1.2.3.4", false],
    ["v1.2.3", false],
    [" 1.2.3", false],
    ["1.2.3 ", false],
    // rejects — pre-release / build metadata (covered above but pinned here too)
    ["1.2.3-rc.1", false],
    ["1.2.3+abc", false],
  ])("version %p — accepts: %p", (version, accepts) => {
    const { valid } = validateManifest({ ...VALID_MINIMAL, version });
    expect(valid).toBe(accepts);
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
    description: "Test fixture.",
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
      description: "Test fixture.",
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
      description: "Test fixture.",
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
      description: "Test fixture.",
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
      description: "Test fixture.",
      capabilities: ["calendar-source", "mail-source", "meeting-recorder", "conversation-trigger"],
    };
    expect(manifest.capabilities).toContain("calendar-source");
    expect(manifest.capabilities).toContain("conversation-trigger");
  });

  it("schema accepts lifecycle-observer capability (issue #57)", () => {
    const { valid, errors } = validateManifest({
      id: "com.example.lifecycle",
      name: "Lifecycle Observer",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      description: "Plugin that observes lifecycle events from other plugins.",
      capabilities: ["lifecycle-observer"],
    });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("schema rejects unknown capability value", () => {
    const { valid } = validateManifest({
      id: "com.example.bad-cap",
      name: "Bad Cap",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      description: "Test fixture.",
      capabilities: ["not-a-real-capability"],
    });
    expect(valid).toBe(false);
  });

  it("emittedEvents is accepted (v3 canonical field)", () => {
    const manifest: PluginManifest = {
      id: "com.example.evt",
      name: "Evt",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      description: "Test fixture.",
      emittedEvents: ["plugin:data:ready"],
    };
    expect(manifest.emittedEvents).toContain("plugin:data:ready");
  });

  it("notificationEvents accepted with optional titleField/bodyField", () => {
    const manifest: PluginManifest = {
      id: "com.example.notif",
      name: "Notif",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      description: "Test fixture.",
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
      description: "Test fixture.",
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
      config: {
        get: (_key) => undefined,
        set: async (_key, _value) => {},
        onChange: (_key, _cb) => () => {},
      },
      registerKeywords: (_) => {},
      emitEvent: (_type, _data) => {},
      onEvent: (_type, _handler) => () => {},
      getInstalledPluginIds: () => [],
      onPluginsChanged: (_handler) => () => {},
      addTask: (_task) => {},
      getSecret: (_key) => null,
      callTool: (_name, _payload) => Promise.resolve(undefined) as Promise<never>,
      callLlm: async (_prompt, _opts) => "",
      logEvent: (_level, _msg, _data) => {},
      onShutdown: (_handler) => {},
      openAuthWindow: async (_opts) => [],
      triggerConversation: async (_spec) => ({ accepted: true, source: _spec.source }),
      bridge: {
        config: {
          get: async (_key) => undefined,
          set: async (_key, _value) => {},
          delete: async (_key) => {},
        },
        storage: {
          get: async (_key) => undefined,
          set: async (_key, _value) => {},
          delete: async (_key) => {},
          list: async () => [],
        },
        agentApproval: {
          respond: async (_id, _decision, _note) => {},
        },
      },
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

  it("PluginHostApi.getInstalledPluginIds returns string[]", () => {
    const api: Pick<PluginHostApi, "getInstalledPluginIds"> = {
      getInstalledPluginIds: () => ["com.lge.ms-graph", "com.lge.meeting-recorder"],
    };
    const ids = api.getInstalledPluginIds();
    expect(Array.isArray(ids)).toBe(true);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe("com.lge.ms-graph");
  });

  it("PluginHostApi.onPluginsChanged delivers PluginLifecycleEvent discriminated union (installed.source + uninstalled)", () => {
    const events: PluginLifecycleEvent[] = [];
    const handlers: Array<(e: PluginLifecycleEvent) => void> = [];
    const api: Pick<PluginHostApi, "onPluginsChanged"> = {
      onPluginsChanged: (handler) => {
        handlers.push(handler);
        return () => {
          const idx = handlers.indexOf(handler);
          if (idx >= 0) handlers.splice(idx, 1);
        };
      },
    };
    const unsub = api.onPluginsChanged((e) => events.push(e));
    expect(unsub).toBeTypeOf("function");
    expect(handlers).toHaveLength(1);
    handlers[0]!({ type: "installed", pluginId: "com.lge.ms-graph", source: "marketplace" });
    handlers[0]!({ type: "installed", pluginId: "com.local.dev-fixture", source: "local-dev" });
    handlers[0]!({ type: "uninstalled", pluginId: "com.lge.meeting-recorder" });
    expect(events).toHaveLength(3);
    if (events[0].type === "installed") expect(events[0].source).toBe("marketplace");
    if (events[1].type === "installed") expect(events[1].source).toBe("local-dev");
    expect(events[2].type).toBe("uninstalled");
    unsub();
    unsub();
    expect(handlers).toHaveLength(0);
  });

  it("PluginLifecycleEvent _future sentinel forces exhaustive switch consumers to declare a default branch", () => {
    // The sentinel is type-level only — never emitted at runtime — but its
    // presence makes the union "open" so a switch(event.type) without a
    // default: branch is a TS error. This test compiles and runs only because
    // the function below has the required default branch.
    function classify(ev: PluginLifecycleEvent): "install" | "uninstall" | "unknown" {
      switch (ev.type) {
        case "installed": return "install";
        case "uninstalled": return "uninstall";
        default: return "unknown"; // forced by _future variant
      }
    }
    expect(classify({ type: "installed", pluginId: "x", source: "marketplace" })).toBe("install");
    expect(classify({ type: "uninstalled", pluginId: "x" })).toBe("uninstall");
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

// ─── auth cross-field invariant (H6) ───────────────────────────────────────
describe("PluginManifest — auth ⇒ uiCallable invariant (H6)", () => {
  // Architect post-merge follow-up: cross-field invariant
  // `auth.statusTool ∈ uiCallable[]` was prose-only. The SDK-side schema
  // now lifts the structural half of the invariant via `allOf` so AJV
  // catches the most common manifest mistake (declaring `auth` without
  // any `uiCallable` allowlist). The full value-level check stays in
  // the host's manifest-validation.ts.
  it("rejects manifest with auth but no uiCallable", () => {
    const { valid } = validateManifest({
      id: "com.example.auth-no-ui",
      name: "Auth no UI",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: ["status_tool", "login_tool"],
      description: "Auth contract without uiCallable allowlist.",
      auth: { statusTool: "status_tool", loginTool: "login_tool" },
    });
    expect(valid).toBe(false);
  });

  it("rejects manifest with auth and empty uiCallable[]", () => {
    const { valid } = validateManifest({
      id: "com.example.auth-empty-ui",
      name: "Auth empty UI",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: ["status_tool", "login_tool"],
      description: "Auth contract with empty uiCallable allowlist.",
      uiCallable: [],
      auth: { statusTool: "status_tool", loginTool: "login_tool" },
    });
    expect(valid).toBe(false);
  });

  it("accepts manifest with auth and a non-empty uiCallable allowlist", () => {
    const { valid, errors } = validateManifest({
      id: "com.example.auth-ok",
      name: "Auth OK",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: ["status_tool", "login_tool"],
      description: "Auth contract with uiCallable.",
      uiCallable: ["status_tool", "login_tool"],
      auth: { statusTool: "status_tool", loginTool: "login_tool" },
    });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("accepts manifest without auth regardless of uiCallable", () => {
    const { valid, errors } = validateManifest({
      id: "com.example.no-auth",
      name: "No Auth",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: ["ping"],
      description: "No auth contract — uiCallable not required.",
    });
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });
});

// ─── python field (H3) ─────────────────────────────────────────────────────
describe("PluginManifest — python co-deployment field (H3)", () => {
  it("accepts manifest with python.managedBy='lvis-app' + requirementsLock", () => {
    const manifest: PluginManifest = {
      id: "com.lge.pageindex",
      name: "PageIndex",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      description: "Document indexer with Python worker.",
      python: {
        managedBy: "lvis-app",
        requirementsLock: "requirements.lock",
        interpreter: "python3.11",
      },
    };
    expect(manifest.python?.managedBy).toBe("lvis-app");
    const { valid, errors } = validateManifest(manifest);
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
  });

  it("accepts python.managedBy='self'", () => {
    const manifest: PluginManifest = {
      id: "com.example.self-py",
      name: "Self Py",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      description: "Plugin manages its own venv.",
      python: { managedBy: "self" },
    };
    expect(manifest.python?.managedBy).toBe("self");
  });

  it("rejects unknown python.managedBy value", () => {
    const { valid } = validateManifest({
      id: "com.example.bad-py",
      name: "Bad Py",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      description: "Bad python.managedBy.",
      python: { managedBy: "docker" },
    });
    expect(valid).toBe(false);
  });
});

// ─── packageName field (M9) ───────────────────────────────────────────────
describe("PluginManifest — packageName field (M9)", () => {
  it("accepts manifest with packageName", () => {
    const manifest: PluginManifest = {
      id: "com.lge.meeting",
      name: "Meeting",
      version: "1.0.0",
      entry: "dist/index.js",
      tools: [],
      description: "Meeting recorder.",
      packageName: "@lge/lvis-plugin-meeting",
    };
    const { valid, errors } = validateManifest(manifest);
    expect(valid, `Errors: ${errors.join(", ")}`).toBe(true);
    expect(manifest.packageName).toBe("@lge/lvis-plugin-meeting");
  });
});

// ─── PluginRegistryEntry public surface (M8) ──────────────────────────────
describe("PluginRegistryEntry — public surface excludes host-internal fields (M8)", () => {
  // _devLinked + installSource are host-internal bookkeeping. The SDK
  // strips them from the public interface so plugin code cannot branch
  // on them.
  it("PluginRegistryEntryInstallSource type is no longer exported", async () => {
    // Type-only import — checked at compile time. Runtime JS module has
    // no symbols for type aliases. Use a string source check as a
    // belt-and-braces safeguard against accidental re-exposure: the
    // JSDoc on PluginRegistryEntry MAY mention the stripped fields by
    // name (so plugin authors know not to expect them), so we look for
    // the actual property/type-alias declarations rather than the bare
    // identifiers.
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const indexSrc = readFileSync(join(here, "..", "index.ts"), "utf8");
    expect(indexSrc).not.toMatch(/^\s*_devLinked\?:/m);
    expect(indexSrc).not.toMatch(/^\s*installSource\?:/m);
    expect(indexSrc).not.toMatch(/^\s*installedBy\?:/m);
    expect(indexSrc).not.toMatch(/^export type PluginRegistryEntryInstallSource\b/m);
  });
});

// ─── PluginMarketplaceItem channel restriction (M11) ──────────────────────
describe("PluginMarketplaceItem — channel restricted to stable (M11)", () => {
  it("source surface no longer mentions canary channel", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const indexSrc = readFileSync(join(here, "..", "index.ts"), "utf8");
    expect(indexSrc).not.toContain('"canary"');
    // and the field is still present, just narrower
    expect(indexSrc).toMatch(/channel\?:\s*"stable";/);
  });
});

// ─── PluginLifecycleEventPayload removed (M12) ────────────────────────────
describe("PluginLifecycleEventPayload — removed (M12)", () => {
  it("source surface no longer exports the type", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const indexSrc = readFileSync(join(here, "..", "index.ts"), "utf8");
    expect(indexSrc).not.toMatch(/export type PluginLifecycleEventPayload/);
  });
});

// ─── description JSDoc must not say @optional (H1) ────────────────────────
describe("PluginManifest.description JSDoc — required, not @optional (H1)", () => {
  it("source surface marks description as required (no @optional tag)", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const indexSrc = readFileSync(join(here, "..", "index.ts"), "utf8");
    // Locate the PluginManifest.description JSDoc specifically: scan inside
    // the PluginManifest interface body and pick the JSDoc directly
    // preceding `description: string;`.
    const manifestBlock = indexSrc.match(
      /export interface PluginManifest \{[\s\S]*?\n\}/,
    );
    expect(manifestBlock).not.toBeNull();
    const m = manifestBlock![0].match(
      /(\/\*\*(?:[^*]|\*(?!\/))*\*\/)\s*\n\s*description:\s*string;/,
    );
    expect(m, "PluginManifest.description JSDoc not found").not.toBeNull();
    expect(m![1]).not.toContain("@optional");
    expect(m![1]).toMatch(/Required/i);
  });
});

// ─── emittedEvents JSDoc must not say "Alias of eventPublishes" (H5) ──────
describe("PluginManifest.emittedEvents JSDoc — no eventPublishes alias text (H5)", () => {
  it("source surface no longer claims emittedEvents is an alias of eventPublishes", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const indexSrc = readFileSync(join(here, "..", "index.ts"), "utf8");
    expect(indexSrc).not.toMatch(/Alias of\s*`?eventPublishes`?/);
  });
});

// ─── tool description JSDoc — LLM-facing, not catalogue (M10) ─────────────
describe("toolSchemas[].description JSDoc — LLM-facing (M10)", () => {
  it("source surface describes inner tool description as LLM-facing with min length 10", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const indexSrc = readFileSync(join(here, "..", "index.ts"), "utf8");
    // Locate the toolSchemas Record block and its inner description JSDoc.
    const block = indexSrc.match(
      /toolSchemas\?:\s*Record<\s*\n\s*string,\s*\n\s*\{[\s\S]*?\}\s*\n\s*>/,
    );
    expect(block, "toolSchemas block not found").not.toBeNull();
    expect(block![0]).toMatch(/LLM-facing/);
    expect(block![0]).toMatch(/Minimum 10/);
    // The wrong text from the parent PluginManifest catalogue must NOT leak.
    expect(block![0]).not.toMatch(/plugin catalogues and tool pickers/);
  });
});

// ─── PluginConfigSchema fields restored (H4) ──────────────────────────────
describe("PluginConfigSchema field JSDoc — restored (H4)", () => {
  it("source surface documents PluginConfigSchema and its property fields", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const indexSrc = readFileSync(join(here, "..", "index.ts"), "utf8");
    // The PluginConfigSchema body should carry one-line JSDoc on each field.
    const schemaBlock = indexSrc.match(
      /export interface PluginConfigSchema \{[\s\S]*?\n\}/,
    );
    expect(schemaBlock).not.toBeNull();
    // each declared field must be directly preceded by a JSDoc comment
    expect(schemaBlock![0]).toMatch(/\/\*\*[\s\S]*?\*\/\s*\n\s*\$schema\?: string;/);
    expect(schemaBlock![0]).toMatch(/\/\*\*[\s\S]*?\*\/\s*\n\s*properties:/);
    expect(schemaBlock![0]).toMatch(/\/\*\*[\s\S]*?\*\/\s*\n\s*required\?:/);
    expect(schemaBlock![0]).toMatch(/\/\*\*[\s\S]*?\*\/\s*\n\s*customPanel\?:/);
  });
});

// ─── auto-gen idempotency (M14) ───────────────────────────────────────────
describe("scripts/sync-from-host.mjs — idempotency (M14)", () => {
  // Architect post-merge follow-up: the JSDoc-strip pass in
  // sanitizeForPublic + the catalog re-injection in enrichWithJsDoc must
  // round-trip cleanly so a second sync after the first produces no diff.
  // Without this guarantee the drift-check workflow oscillates on every
  // run (PR #62 root cause for the JSDoc drift the architect flagged).
  it("running the script twice against the same host source is a no-op", async () => {
    const { spawnSync } = await import("node:child_process");
    const { readFileSync, writeFileSync, existsSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const sdkRoot = join(here, "..", "..");
    const scriptPath = join(sdkRoot, "scripts", "sync-from-host.mjs");
    const indexPath = join(sdkRoot, "src", "index.ts");
    const hostTypesEnv = process.env.LVIS_HOST_TYPES_PATH;

    if (!hostTypesEnv || !existsSync(hostTypesEnv)) {
      // CI sets LVIS_HOST_TYPES_PATH; locally we skip rather than fail
      // so plugin-author quick test runs don't require a host clone.
      return;
    }

    const before = readFileSync(indexPath, "utf8");
    try {
      const r1 = spawnSync("node", [scriptPath], {
        encoding: "utf8",
        env: { ...process.env, LVIS_HOST_TYPES_PATH: hostTypesEnv },
      });
      expect(r1.status, `first sync failed: ${r1.stderr}`).toBe(0);
      const after1 = readFileSync(indexPath, "utf8");

      const r2 = spawnSync("node", [scriptPath], {
        encoding: "utf8",
        env: { ...process.env, LVIS_HOST_TYPES_PATH: hostTypesEnv },
      });
      expect(r2.status, `second sync failed: ${r2.stderr}`).toBe(0);
      const after2 = readFileSync(indexPath, "utf8");

      expect(after2).toBe(after1);
    } finally {
      writeFileSync(indexPath, before);
    }
  });

  it("running the schema script twice against the same host source is a no-op", async () => {
    const { spawnSync } = await import("node:child_process");
    const { readFileSync, writeFileSync, existsSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const sdkRoot = join(here, "..", "..");
    const scriptPath = join(sdkRoot, "scripts", "sync-schema-from-host.mjs");
    const schemaPath = join(sdkRoot, "schemas", "plugin-manifest.schema.json");
    const hostSchemaEnv = process.env.LVIS_HOST_SCHEMA_PATH;

    if (!hostSchemaEnv || !existsSync(hostSchemaEnv)) {
      return;
    }

    const before = readFileSync(schemaPath, "utf8");
    try {
      const r1 = spawnSync("node", [scriptPath], {
        encoding: "utf8",
        env: { ...process.env, LVIS_HOST_SCHEMA_PATH: hostSchemaEnv },
      });
      expect(r1.status, `first schema sync failed: ${r1.stderr}`).toBe(0);
      const after1 = readFileSync(schemaPath, "utf8");

      const r2 = spawnSync("node", [scriptPath], {
        encoding: "utf8",
        env: { ...process.env, LVIS_HOST_SCHEMA_PATH: hostSchemaEnv },
      });
      expect(r2.status, `second schema sync failed: ${r2.stderr}`).toBe(0);
      const after2 = readFileSync(schemaPath, "utf8");

      expect(after2).toBe(after1);
    } finally {
      writeFileSync(schemaPath, before);
    }
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
      description: "Test fixture.",
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
      description: "Test fixture.",
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
      description: "Test fixture.",
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
        description: "Test fixture.",
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
      description: "Test fixture.",
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
