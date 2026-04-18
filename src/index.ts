// AUTO-GENERATED — DO NOT EDIT. Regenerate via: bun run sync:from-host
//
// @lvis/plugin-sdk — type-only public surface of the LVIS plugin contract.
// This file mirrors the host plugin type contract.

/**
 * Deployment channel for a plugin.
 *
 * - `"managed"` — curated, reviewed plugin distributed through the official
 *   marketplace. The host may apply stricter permissioning and automatic
 *   updates.
 * - `"user"` — locally installed or side-loaded plugin authored by the end
 *   user. Receives a narrower trust scope by default.
 */
export type DeploymentMode = "managed" | "user";

/**
 * Declarative metadata for a plugin. Describes the tools, capabilities, UI
 * extensions, lifecycle, and permissions a plugin exposes to the host.
 *
 * The manifest is statically parsed by the host before the plugin runtime
 * loads, so keep it free of runtime-only values. All tool names must match
 * the pattern `^[a-zA-Z_][a-zA-Z0-9_]*$` — dots and hyphens are rejected.
 *
 * @example
 * const manifest: PluginManifest = {
 *   id: "com.example.my-plugin",
 *   name: "My Plugin",
 *   version: "1.0.0",
 *   entry: "dist/index.js",
 *   tools: ["my_plugin_ping"],
 * };
 */
export interface PluginManifest {
  
  /** Globally unique identifier. Reverse-DNS style recommended (for example `com.example.my-plugin`). Must be stable across versions. */
  id: string;
  /** Human-readable display name shown in the host UI and plugin pickers. */
  name: string;
  /** SemVer version string (for example `1.2.3`). Used by the host to detect updates and enforce compatibility. */
  version: string;
  /** Path (relative to the plugin root) to the JavaScript module whose default export is a `RuntimePluginFactory`. */
  entry: string;
  
  /** Tool names exposed to the host LLM. Each name must match `^[a-zA-Z_][a-zA-Z0-9_]*$` — dots and hyphens are not allowed. */
  tools: string[];
  
  /** One-line description shown in plugin catalogues and tool pickers. @optional */
  description?: string;
  /** Arbitrary JSON configuration merged into `PluginRuntimeContext.config` at startup. Treat as untrusted user data. @optional */
  config?: Record<string, unknown>;
  /** Sidebar / panel UI extensions contributed by this plugin. @optional */
  ui?: PluginUiExtension[];
  /** Skill keywords registered with the host keyword engine. Each entry binds a surface keyword to a `skillId` the plugin handles. @optional */
  keywords?: Array<{ keyword: string; skillId: string }>;
  
  /** Free-form capability tags declared by the plugin (for example `"calendar"`, `"email"`). Hosts may gate features on these. @optional */
  capabilities?: string[];
  /** Tools that should be invoked once during plugin startup, before the first user interaction. @optional */
  startupTools?: string[];
  /** Event type names this plugin subscribes to. The host delivers matching events via `PluginHostApi.onEvent`. @optional */
  eventSubscriptions?: string[];
  
  /** Tools that the UI is permitted to invoke directly (bypassing the LLM). Use sparingly — prefer LLM-mediated calls. @optional */
  uiCallable?: string[];
  
  /** Events that should be surfaced as host notifications. Each entry names the event and maps fields of its payload to notification title and body. @optional */
  notificationEvents?: Array<{
    event: string;
    titleField?: string;
    bodyField?: string;
  }>;
  /** Deployment channel. Defaults to `"user"` when omitted. @optional */
  deployment?: DeploymentMode;
  /** Display string identifying the plugin publisher (for example an organization or author). @optional */
  publisher?: string;
  
  /** Maximum time in milliseconds the host will wait for `RuntimePlugin.start` to resolve. Plugins exceeding this are considered failed. @optional */
  startupTimeoutMs?: number;
  
  /** JSON Schema descriptions of each tool's input. Used by the host to advertise tools to the LLM and to validate arguments before dispatch. Keys must appear in `tools`. @optional */
  toolSchemas?: Record<
    string,
    {
      /** One-line description shown in plugin catalogues and tool pickers. @optional */
      description: string;
      inputSchema: {
        $schema?: string;
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
        additionalProperties?: boolean;
      };
    }
  >;
}

/**
 * Declaration of a UI surface contributed by a plugin. The host renders the
 * extension inside the requested slot and loads the referenced module or
 * page lazily when the surface becomes visible.
 */
export interface PluginUiExtension {
  /** Identifier unique within the plugin. Used as a stable key for persistence and host routing. */
  id: string;
  /** UI slot into which the extension is mounted. Currently only `"sidebar"` is supported. */
  slot: "sidebar";
  /**
   * Rendering strategy:
   * - `"embedded-module"` — module exporting a component mounted in-process.
   * - `"embedded-page"` — full-page HTML loaded in an isolated frame.
   * - `"info-card"` — lightweight read-only card rendered from `defaults`.
   */
  kind: "embedded-module" | "embedded-page" | "info-card";
  /** Name shown in navigation. Falls back to `title` when omitted. @optional */
  displayName?: string;
  /** Title shown at the top of the extension surface. */
  title: string;
  /** Short description shown alongside the title. @optional */
  description?: string;
  /** Default data passed to the extension on mount. For `info-card` kinds this is the rendered content. @optional */
  defaults?: Record<string, unknown>;
  /** Path (relative to the plugin root) of the module to load for `embedded-module`. @optional */
  entry?: string;
  /** Named export within `entry` to mount. Defaults to the module's default export. @optional */
  exportName?: string;
  /** Path (relative to the plugin root) of the HTML page to load for `embedded-page`. @optional */
  page?: string;
}

/**
 * Entry in the host's local plugin registry. The registry records which
 * plugins are installed, where their manifests live, and whether they are
 * currently enabled.
 */
export interface PluginRegistryEntry {
  /** Plugin identifier, matching `PluginManifest.id`. */
  id: string;
  /** Absolute or host-relative filesystem path to the plugin's `manifest.json`. */
  manifestPath: string;
  /** Whether the plugin should be loaded at host startup. Defaults to `true` when omitted. @optional */
  enabled?: boolean;
}

/**
 * Persisted collection of installed plugins. Serialized to disk by the host
 * and read at boot time to determine which plugins to load.
 */
export interface PluginRegistry {
  /** Schema version of this registry file. Increment on breaking layout changes. */
  version: number;
  /** Installed plugins, in the order the host should consider them. */
  plugins: PluginRegistryEntry[];
}

/**
 * Catalog entry describing a plugin available for installation through the
 * host marketplace. This is the user-facing summary of a plugin before it is
 * downloaded — not the full manifest.
 */
export interface PluginMarketplaceItem {
  /** Plugin identifier, matching the `PluginManifest.id` the plugin will declare once installed. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Marketing description shown in the marketplace UI. */
  description: string;
  /** Installable package specifier (for example an npm spec or tarball URL) used to acquire the plugin artifact. */
  packageSpec: string;
  /** Canonical package name (for example the npm package name) used to identify updates. */
  packageName: string;
  /** Tools the plugin will expose — mirrors `PluginManifest.tools` for preview purposes. */
  tools: string[];
  /** Default configuration seeded into the plugin on first install. Users may override this. @optional */
  defaultConfig?: Record<string, unknown>;
  /** UI extensions the plugin will contribute once installed. @optional */
  ui?: PluginUiExtension[];
  /** Deployment channel. @optional */
  deployment?: DeploymentMode;
  /** Display string identifying the publisher. @optional */
  publisher?: string;
}

/**
 * Services exposed by the host to a running plugin. An instance is provided
 * on `PluginRuntimeContext.hostApi` when the host calls the plugin's
 * `RuntimePluginFactory`.
 *
 * All methods are safe to call after `RuntimePlugin.start` resolves. Treat
 * every handler returned to the host as potentially long-lived: the host may
 * keep references across the plugin's lifetime.
 */
export interface PluginHostApi {
  registerKeywords(keywords: Array<{ keyword: string; skillId: string }>): void;
  emitEvent(eventType: string, data?: unknown): void;
  
  onEvent(eventType: string, handler: (data: unknown) => void): () => void;
  addTask(task: {
    title: string;
    description?: string;
    source: string;
    sourceRef?: string;
    priority?: "high" | "medium" | "low";
  }): void;
  saveNote(title: string, content: string): void;
  getSecret(key: string): string | null;

  getMsGraphToken(): Promise<string | null>;
  startMsGraphAuth(openBrowser: (url: string) => Promise<void>): Promise<void>;
  isMsGraphAuthenticated(): boolean;
  getMsGraphAccount(): string | null;
  onMsGraphAuthChange(handler: () => void): void;

  
  withMsGraphRetry<T>(fn: (token: string) => Promise<T>): Promise<T>;

  
  callLlm(prompt: string, options?: { maxTokens?: number; systemPrompt?: string }): Promise<string>;

  
  logEvent(level: "info" | "warn" | "error", message: string, data?: unknown): void;

  
  onShutdown(handler: () => void | Promise<void>): void;
}

/**
 * Alias of `PluginToolHandler` retained for older call sites that describe
 * the same function in method-style terminology.
 */
export type PluginMethodHandler = PluginToolHandler;

/**
 * Execution context supplied by the host when instantiating a plugin through
 * its `RuntimePluginFactory`. The context gives the plugin access to its
 * configuration, its filesystem roots, a scoped logger, and the full host
 * API.
 */
export interface PluginRuntimeContext {
  /** Plugin identifier, matching `PluginManifest.id`. */
  pluginId: string;
  /** Absolute filesystem path to the plugin's installed root directory. Safe for the plugin to read from. */
  pluginRoot: string;
  /** Absolute filesystem path to the host's working directory. Plugins should avoid writing here directly. */
  hostRoot: string;
  /** Merged configuration (manifest defaults + user overrides) for this plugin instance. @optional */
  config?: Record<string, unknown>;
  /**
   * Scoped logger that prefixes entries with the plugin id. Prefer this over
   * `console.*` so host log routing and filtering work correctly.
   */
  log: (message: string, meta?: unknown) => void;
  /** Host services exposed to the plugin. */
  hostApi: PluginHostApi;
}

/**
 * Function signature for a tool or method exposed by a plugin. The handler
 * receives the tool's invocation payload (already validated against the
 * tool's JSON Schema, if declared) and returns a result that the host
 * serializes back to the caller.
 *
 * Handlers may be synchronous or asynchronous. Thrown errors are surfaced
 * to the caller as tool errors.
 */
export type PluginToolHandler = (payload?: unknown) => Promise<unknown> | unknown;

/**
 * Runtime object produced by a `RuntimePluginFactory`. Exposes lifecycle
 * hooks and the map of tool handlers the host can dispatch to.
 */
export interface RuntimePlugin {
  /** Invoked once after construction. Perform asynchronous setup here (opening connections, restoring state, etc.). @optional */
  start?: () => Promise<void> | void;
  /** Invoked during host shutdown or plugin unload. Release resources and flush state. @optional */
  stop?: () => Promise<void> | void;
  /**
   * Map of tool name to handler. Keys must match entries in
   * `PluginManifest.tools`. The host rejects calls to missing handlers.
   */
  handlers: Record<string, PluginToolHandler>;
}

/**
 * Factory function exported (as default) from a plugin's `entry` module.
 * The host invokes the factory once with a `PluginRuntimeContext` and
 * expects a `RuntimePlugin` (possibly asynchronously).
 *
 * @example
 * const factory: RuntimePluginFactory = async (ctx) => ({
 *   async start() { ctx.log("ready"); },
 *   handlers: {
 *     my_plugin_ping: async () => ({ ok: true }),
 *   },
 * });
 * export default factory;
 */
export type RuntimePluginFactory = (context: PluginRuntimeContext) => Promise<RuntimePlugin> | RuntimePlugin;
