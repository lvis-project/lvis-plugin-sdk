#!/usr/bin/env node
/**
 * Extract type-only declarations from the host repository into src/index.ts.
 *
 * Usage:
 *   node scripts/sync-from-host.mjs              # write src/index.ts
 *   node scripts/sync-from-host.mjs --check      # exit 1 if regenerated output differs from committed
 *
 * Host source resolution (in order):
 *   1. LVIS_HOST_TYPES_PATH env var pointing to a local types.ts file.
 *   2. Git clone via LVIS_HOST_REPO_URL + HOST_REF (default branch: main).
 * If neither is set, the script errors out.
 */

import ts from "typescript";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let CLONE_TMP_DIR = null;

function resolveHostTypesPath() {
  const envPath = process.env.LVIS_HOST_TYPES_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return { path: envPath, source: `env:${envPath}` };
  }
  const url = process.env.LVIS_HOST_REPO_URL;
  if (!url) {
    console.error(
      "ERROR: host types source not configured. Set LVIS_HOST_TYPES_PATH to a local file, or set LVIS_HOST_REPO_URL (and optionally HOST_REF) to clone the host repository."
    );
    process.exit(1);
  }
  const ref = process.env.HOST_REF || "main";
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "host-types-"));
  CLONE_TMP_DIR = tmp;
  try {
    execSync(`git clone --depth 1 --branch ${ref} ${url} ${tmp}`, {
      stdio: "inherit",
    });
  } catch (e) {
    console.error(`Failed to clone ${url}.`);
    throw e;
  }
  return { path: path.join(tmp, "src/plugins/types.ts"), source: `clone@${ref}` };
}

function hasExportModifier(stmt) {
  return stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function hasDefaultModifier(stmt) {
  return stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
}

function extract(srcPath) {
  const text = fs.readFileSync(srcPath, "utf8");
  const sf = ts.createSourceFile(srcPath, text, ts.ScriptTarget.ES2022, true);
  const chunks = [];

  for (const stmt of sf.statements) {
    if (!hasExportModifier(stmt)) continue;

    if (hasDefaultModifier(stmt)) {
      console.error(
        `ERROR: default export not allowed in host types.ts (found at pos ${stmt.pos})`
      );
      process.exit(1);
    }

    // Reject re-exports (export { X } from "./y") — types.ts must be self-contained.
    if (ts.isExportDeclaration(stmt)) {
      console.error(
        `ERROR: re-export declarations not supported: ${text.slice(stmt.pos, stmt.end).trim()}`
      );
      process.exit(1);
    }

    const supported =
      ts.isInterfaceDeclaration(stmt) ||
      ts.isTypeAliasDeclaration(stmt) ||
      ts.isEnumDeclaration(stmt) ||
      ts.isClassDeclaration(stmt) ||
      ts.isVariableStatement(stmt);

    if (!supported) {
      console.error(
        `ERROR: unsupported exported form: ${ts.SyntaxKind[stmt.kind]} — ${text
          .slice(stmt.pos, stmt.end)
          .trim()
          .slice(0, 120)}`
      );
      process.exit(1);
    }

    const leading = ts.getLeadingCommentRanges(text, stmt.pos) ?? [];
    const commentText = leading.map((r) => text.slice(r.pos, r.end)).join("\n");
    // stmt.getStart(sf) skips leading trivia (comments/whitespace) so we don't
    // duplicate JSDoc that we already captured via getLeadingCommentRanges.
    const declText = text.slice(stmt.getStart(sf), stmt.end);
    chunks.push((commentText ? commentText.trim() + "\n" : "") + declText);
  }

  return chunks.join("\n\n") + "\n";
}

function render(body) {
  return `// AUTO-GENERATED — DO NOT EDIT. Regenerate via: bun run sync:from-host
//
// @lvis/plugin-sdk — type-only public surface of the LVIS plugin contract.
// This file mirrors the host plugin type contract.

${body}`;
}

/**
 * Strip all JSDoc block comments and single-line comments (except the top banner).
 * The SDK is type-only; TypeScript's own type signatures are sufficient documentation
 * for consumers, and stripping comments wholesale avoids leaking internal prose.
 * Applied to BOTH write and --check paths so drift-check is deterministic.
 */
function sanitizeForPublic(text) {
  // Strip all JSDoc block comments /** ... */
  let out = text.replace(/\/\*\*[\s\S]*?\*\//g, "");
  // Strip single-line // comments EXCEPT the banner lines at the very top
  const lines = out.split("\n");
  const cleaned = lines.map((line, i) => {
    if (i < 5) return line;               // preserve top banner
    if (/^\s*\/\//.test(line)) return ""; // drop other // lines
    return line;
  });
  out = cleaned.join("\n");
  // Collapse blank runs
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trimStart();
}

/**
 * Catalog of English JSDoc blocks to inject for each exported declaration
 * after sanitization. This lets the SDK ship a thoroughly documented public
 * surface while keeping the host source file free of SDK-specific prose.
 *
 * Each entry:
 *   - `leading`: JSDoc block inserted immediately before the declaration.
 *   - `fields` (optional): map of field name → JSDoc block, inserted before
 *     the matching field line inside an interface body.
 */
const JSDOC_CATALOG = {
  EventSubscriptionHint: {
    leading: `/**
 * Optional structured hint attached to an event subscription. Allows the host
 * to surface contextual metadata alongside the subscription.
 */`,
    fields: {
      category: `/** Broad category the event falls into. */`,
      priority: `/** Relative importance used by the host to order or filter subscriptions. */`,
      title: `/** Short human-readable label shown in the host UI for this subscription. */`,
    },
  },
  EventSubscription: {
    leading: `/**
 * Object form of an event subscription entry. Use when you need to attach a
 * hint to a subscription; otherwise prefer the plain string form.
 */`,
    fields: {
      type: `/** Event type name. Must match the string form used in published event declarations. */`,
      hint: `/** Optional structured hint shown by the host alongside the subscription. @optional */`,
    },
  },
  PluginManifest: {
    leading: `/**
 * Declarative metadata for a plugin. Describes the tools, capabilities, UI
 * extensions, lifecycle, and permissions a plugin exposes to the host.
 *
 * The manifest is statically parsed by the host before the plugin runtime
 * loads, so keep it free of runtime-only values. All tool names must match
 * the pattern \`^[a-zA-Z_][a-zA-Z0-9_]*$\` — dots and hyphens are rejected.
 *
 * @example
 * const manifest: PluginManifest = {
 *   id: "com.example.my-plugin",
 *   name: "My Plugin",
 *   version: "1.0.0",
 *   entry: "dist/index.js",
 *   tools: ["my_plugin_ping"],
 * };
 */`,
    fields: {
      id: `/** Globally unique identifier. Reverse-DNS style recommended (for example \`com.example.my-plugin\`). Must be stable across versions. */`,
      name: `/** Human-readable display name shown in the host UI and plugin pickers. */`,
      version: `/** SemVer version string (for example \`1.2.3\`). Used by the host to detect updates and enforce compatibility. */`,
      entry: `/** Path (relative to the plugin root) to the JavaScript module whose default export is a \`RuntimePluginFactory\`. */`,
      tools: `/** Tool names exposed to the host LLM. Each name must match \`^[a-zA-Z_][a-zA-Z0-9_]*$\` — dots and hyphens are not allowed. */`,
      description: `/** One-line description shown in plugin catalogues and tool pickers. @optional */`,
      config: `/** Arbitrary JSON configuration merged into \`PluginRuntimeContext.config\` at startup. Treat as untrusted user data. @optional */`,
      ui: `/** Sidebar / panel UI extensions contributed by this plugin. @optional */`,
      keywords: `/** Skill keywords registered with the host keyword engine. Each entry binds a surface keyword to a \`skillId\` the plugin handles. @optional */`,
      capabilities: `/** Free-form capability tags declared by the plugin (for example \`"calendar"\`, \`"email"\`). Hosts may gate features on these. @optional */`,
      startupTools: `/** Tools that should be invoked once during plugin startup, before the first user interaction. @optional */`,
      eventSubscriptions: `/** Event type names this plugin subscribes to. The host delivers matching events via \`PluginHostApi.onEvent\`. @optional */`,
      eventPublishes: `/** Event type names this plugin may emit. Hosts can use this for validation and ownership checks. @optional */`,
      emittedEvents: `/** Alias of \`eventPublishes\` accepted by host bridge paths. @optional */`,
      uiCallable: `/** Tools that the UI is permitted to invoke directly (bypassing the LLM). Use sparingly — prefer LLM-mediated calls. @optional */`,
      notificationEvents: `/** Events that should be surfaced as host notifications. Each entry names the event and maps fields of its payload to notification title and body. @optional */`,
      publisher: `/** Display string identifying the plugin publisher (for example an organization or author). @optional */`,
      startupTimeoutMs: `/** Maximum time in milliseconds the host will wait for \`RuntimePlugin.start\` to resolve. Plugins exceeding this are considered failed. @optional */`,
      toolSchemas: `/** JSON Schema descriptions of each tool's input. Used by the host to advertise tools to the LLM and to validate arguments before dispatch. Keys must appear in \`tools\`. @optional */`,
    },
  },
  PluginUiExtension: {
    leading: `/**
 * Declaration of a UI surface contributed by a plugin. The host renders the
 * extension inside the requested slot and loads the referenced module or
 * page lazily when the surface becomes visible.
 */`,
    fields: {
      id: `/** Identifier unique within the plugin. Used as a stable key for persistence and host routing. */`,
      slot: `/** UI slot into which the extension is mounted. Currently only \`"sidebar"\` is supported. */`,
      kind: `/**
 * Rendering strategy:
 * - \`"embedded-module"\` — module exporting a component mounted in-process.
 * - \`"embedded-page"\` — full-page HTML loaded in an isolated frame.
 * - \`"info-card"\` — lightweight read-only card rendered from \`defaults\`.
 */`,
      displayName: `/** Name shown in navigation. Falls back to \`title\` when omitted. @optional */`,
      title: `/** Title shown at the top of the extension surface. */`,
      description: `/** Short description shown alongside the title. @optional */`,
      defaults: `/** Default data passed to the extension on mount. For \`info-card\` kinds this is the rendered content. @optional */`,
      entry: `/** Path (relative to the plugin root) of the module to load for \`embedded-module\`. @optional */`,
      exportName: `/** Named export within \`entry\` to mount. Defaults to the module's default export. @optional */`,
      page: `/** Path (relative to the plugin root) of the HTML page to load for \`embedded-page\`. @optional */`,
    },
  },
  PluginRegistryEntry: {
    leading: `/**
 * Entry in the host's local plugin registry. The registry records which
 * plugins are installed, where their manifests live, and whether they are
 * currently enabled.
 */`,
    fields: {
      id: `/** Plugin identifier, matching \`PluginManifest.id\`. */`,
      manifestPath: `/** Absolute or host-relative filesystem path to the plugin's \`manifest.json\`. */`,
      enabled: `/** Whether the plugin should be loaded at host startup. Defaults to \`true\` when omitted. @optional */`,
    },
  },
  PluginRegistry: {
    leading: `/**
 * Persisted collection of installed plugins. Serialized to disk by the host
 * and read at boot time to determine which plugins to load.
 */`,
    fields: {
      version: `/** Schema version of this registry file. Increment on breaking layout changes. */`,
      plugins: `/** Installed plugins, in the order the host should consider them. */`,
    },
  },
  PluginMarketplaceItem: {
    leading: `/**
 * Catalog entry describing a plugin available for installation through the
 * host marketplace. This is the user-facing summary of a plugin before it is
 * downloaded — not the full manifest.
 */`,
    fields: {
      id: `/** Plugin identifier, matching the \`PluginManifest.id\` the plugin will declare once installed. */`,
      name: `/** Human-readable display name. */`,
      description: `/** Marketing description shown in the marketplace UI. */`,
      packageSpec: `/** Installable package specifier (for example an npm spec or tarball URL) used to acquire the plugin artifact. */`,
      packageName: `/** Canonical package name (for example the npm package name) used to identify updates. */`,
      tools: `/** Tools the plugin will expose — mirrors \`PluginManifest.tools\` for preview purposes. */`,
      defaultConfig: `/** Default configuration seeded into the plugin on first install. Users may override this. @optional */`,
      ui: `/** UI extensions the plugin will contribute once installed. @optional */`,
      publisher: `/** Display string identifying the publisher. @optional */`,
    },
  },
  PluginHostApi: {
    leading: `/**
 * Services exposed by the host to a running plugin. An instance is provided
 * on \`PluginRuntimeContext.hostApi\` when the host calls the plugin's
 * \`RuntimePluginFactory\`.
 *
 * All methods are safe to call after \`RuntimePlugin.start\` resolves. Treat
 * every handler returned to the host as potentially long-lived: the host may
 * keep references across the plugin's lifetime.
 */`,
    fields: {
      registerKeywords: `/**
 * Register skill keywords with the host's keyword engine. When the user
 * types or says one of the registered keywords the host routes the request
 * to the associated \`skillId\`, which the plugin must handle via a tool
 * dispatch.
 *
 * @param keywords - Keyword/skill pairs to register. Calling again appends;
 *                   duplicate keywords are deduplicated by the host.
 * @example
 * hostApi.registerKeywords([
 *   { keyword: "weather", skillId: "forecast.today" },
 * ]);
 */`,
      emitEvent: `/**
 * Emit a host-wide event. Other plugins subscribed to \`eventType\` via
 * \`onEvent\` receive the payload. The host also bridges events to its own
 * internal listeners.
 *
 * @param eventType - Dot-delimited event name (for example \`"calendar.updated"\`).
 * @param data - JSON-serializable payload. @optional
 */`,
      onEvent: `/**
 * Subscribe to host events. The returned function removes the subscription
 * when invoked. Call it during \`RuntimePlugin.stop\` to avoid leaking
 * handlers.
 *
 * @param eventType - Event name to listen for.
 * @param handler - Invoked with the emitted payload.
 * @returns Unsubscribe function.
 */`,
      addTask: `/**
 * Create a task in the host's task list.
 *
 * @param task - Task metadata. \`source\` identifies the originating plugin
 *               or feature; \`sourceRef\` is an optional stable pointer back
 *               to the originating entity (for example an email id).
 */`,
      saveNote: `/**
 * Persist a user-facing note to the host notes store.
 *
 * @param title - Note title (used as the filename basis).
 * @param content - Markdown note body.
 */`,
      getSecret: `/**
 * Retrieve an encrypted secret previously stored by the host or the user
 * (for example an API key).
 *
 * @param key - Secret key.
 * @returns The secret value, or \`null\` if no secret exists for \`key\`.
 */`,
      getMsGraphToken: `/**
 * Fetch a cached Microsoft Graph OAuth access token, if the user has
 * completed authentication. Returns \`null\` when no valid token is cached.
 */`,
      startMsGraphAuth: `/**
 * Begin the Microsoft Graph OAuth authorization flow. The host generates
 * the authorization URL and hands it to \`openBrowser\` so the plugin or UI
 * can open it in the user's default browser.
 *
 * @param openBrowser - Opens the supplied URL for user consent.
 */`,
      isMsGraphAuthenticated: `/**
 * @returns \`true\` when the host currently holds a valid Microsoft Graph
 *          authentication context for the user.
 */`,
      getMsGraphAccount: `/**
 * @returns The authenticated Microsoft Graph account identifier (typically
 *          the user principal name), or \`null\` when not authenticated.
 */`,
      onMsGraphAuthChange: `/**
 * Subscribe to Microsoft Graph authentication state changes. The handler is
 * invoked whenever the user signs in, signs out, or tokens are refreshed.
 */`,
      withMsGraphRetry: `/**
 * Execute \`fn\` with a freshly acquired Microsoft Graph access token,
 * automatically retrying once on a 401 response with a refreshed token.
 *
 * @param fn - Receives a valid bearer token and performs a Graph call.
 * @returns Whatever \`fn\` returns on success.
 */`,
      callLlm: `/**
 * Invoke the host's configured language model.
 *
 * @param prompt - User prompt string.
 * @param options.maxTokens - Upper bound on completion tokens. @optional
 * @param options.systemPrompt - System instructions prepended to the call. @optional
 * @returns The model's completion text.
 */`,
      logEvent: `/**
 * Emit a structured log entry to the host log pipeline.
 *
 * @param level - Severity.
 * @param message - Human-readable message.
 * @param data - Arbitrary structured payload. @optional
 */`,
      onShutdown: `/**
 * Register a handler invoked when the host is shutting down. The host waits
 * for returned promises to resolve before exiting, giving the plugin a
 * chance to flush state.
 */`,
      triggerConversation: `/**
 * Start a new conversation turn from a proactive plugin signal (for example
 * when the plugin observes that a meeting-request mail just arrived and the
 * user should respond).
 *
 * Capability gate: the plugin's manifest must declare \`conversation-trigger\`,
 * otherwise the host returns \`{ accepted: false, reason: "capability_denied" }\`.
 * Branch on \`accepted\` — this case is not signalled by an exception.
 *
 * Safety contract — caller MUST follow:
 *  - \`spec.prompt\` is a templated message owned by the plugin, NOT raw
 *    third-party content (mail body, transcript, etc.). Both \`prompt\` and
 *    \`context\` are recorded into the host audit chain.
 *  - \`spec.source\` must match \`^proactive:[a-z][a-z0-9-]*$\` and identify
 *    the originating signal.
 *  - Use \`spec.dedupeKey\` to suppress duplicate triggers for the same
 *    underlying observation.
 *
 * @param spec - Trigger payload. See \`ConversationTriggerSpec\`.
 * @returns A \`ConversationTriggerResult\` describing whether the trigger was
 *          accepted. When \`accepted\` is \`false\`, \`reason\` carries the cause.
 */`,
    },
  },
  ConversationTriggerSpec: {
    leading: `/**
 * Spec for \`PluginHostApi.triggerConversation()\`. Passed by a brain plugin
 * when it decides a signal warrants starting a conversation.
 *
 * Treat all string fields as plugin-owned: do NOT inline raw third-party
 * content (mail bodies, transcripts) into \`prompt\` or \`context\` — the host
 * will record both into its audit chain.
 */`,
    fields: {
      prompt: `/** Templated message — NEVER raw third-party content. See safety contract on \`PluginHostApi.triggerConversation\`. */`,
      source: `/** Origin tag identifying the signal. Must match \`^proactive:[a-z][a-z0-9-]*$\` (for example \`proactive:meeting-detection\`). */`,
      context: `/**
 * Side-channel metadata (IDs, references) recorded with the trigger.
 *
 * **P0 limitation:** the host currently records \`context\` only into the
 * audit chain — the ConversationLoop pipeline (system-prompt builder, tools,
 * history) does NOT receive it. Plugins that need the LLM or tools to act on
 * an ID (for example \`emailId\`) MUST embed the ID in \`prompt\` itself so it
 * survives the trip into the loop. A future P2 will wire \`context\` into
 * per-turn metadata; the field is kept now so adding plumbing later is
 * non-breaking.
 *
 * @optional
 */`,
      visibility: `/**
 * UI behaviour:
 *  - \`silent\` — run without surfacing to the user; only audit + result tools.
 *  - \`summary-only\` — show one-line completion notice (default).
 *  - \`user-visible\` — surface as if the user opened a turn, modal-style.
 *
 * **P0 limitation:** all three values currently produce identical UI
 * behaviour — recorded into audit only. P2 will add the actual UI branching.
 *
 * @optional
 */`,
      priority: `/** Routing hint for queueing when multiple triggers compete (audit-only in P0). @optional */`,
      dedupeKey: `/** Suppress duplicate triggers for the same observation. The dedupe window is enforced by the host. @optional */`,
    },
  },
  ConversationTriggerResult: {
    leading: `/**
 * Outcome of a \`PluginHostApi.triggerConversation()\` call. When \`accepted\`
 * is \`false\`, \`reason\` describes why; \`source\` is echoed back so callers can
 * correlate logs across plugin and host.
 */`,
    fields: {
      accepted: `/** Whether the trigger was accepted for execution. */`,
      reason: `/**
 * When \`accepted\` is \`false\`, the cause:
 *  - \`capability_denied\` — plugin lacks \`conversation-trigger\`.
 *  - \`invalid_source\` — \`source\` does not match \`^proactive:[a-z][a-z0-9-]*$\`,
 *    \`prompt\` empty, or other shape problem.
 *  - \`duplicate\` — \`dedupeKey\` matched a recent trigger.
 *  - \`rate_limited\` — per-plugin call cap exceeded (sliding window).
 *  - \`loop_unavailable\` — ConversationLoop not yet bound (boot ordering).
 *
 * @optional
 */`,
      source: `/** Echoed back from the request so callers can correlate logs across plugin and host. */`,
    },
  },
  PluginMethodHandler: {
    leading: `/**
 * Alias of \`PluginToolHandler\` retained for older call sites that describe
 * the same function in method-style terminology.
 */`,
  },
  PluginRuntimeContext: {
    leading: `/**
 * Execution context supplied by the host when instantiating a plugin through
 * its \`RuntimePluginFactory\`. The context gives the plugin access to its
 * configuration, its filesystem roots, a scoped logger, and the full host
 * API.
 */`,
    fields: {
      pluginId: `/** Plugin identifier, matching \`PluginManifest.id\`. */`,
      pluginRoot: `/** Absolute filesystem path to the plugin's installed root directory. Safe for the plugin to read from. */`,
      hostRoot: `/** Absolute filesystem path to the host's working directory. Plugins should avoid writing here directly. */`,
      config: `/** Merged configuration (manifest defaults + user overrides) for this plugin instance. @optional */`,
      log: `/**
 * Scoped logger that prefixes entries with the plugin id. Prefer this over
 * \`console.*\` so host log routing and filtering work correctly.
 */`,
      hostApi: `/** Host services exposed to the plugin. */`,
    },
  },
  PluginToolHandler: {
    leading: `/**
 * Function signature for a tool or method exposed by a plugin. The handler
 * receives the tool's invocation payload (already validated against the
 * tool's JSON Schema, if declared) and returns a result that the host
 * serializes back to the caller.
 *
 * Handlers may be synchronous or asynchronous. Thrown errors are surfaced
 * to the caller as tool errors.
 */`,
  },
  RuntimePlugin: {
    leading: `/**
 * Runtime object produced by a \`RuntimePluginFactory\`. Exposes lifecycle
 * hooks and the map of tool handlers the host can dispatch to.
 */`,
    fields: {
      start: `/** Invoked once after construction. Perform asynchronous setup here (opening connections, restoring state, etc.). @optional */`,
      stop: `/** Invoked during host shutdown or plugin unload. Release resources and flush state. @optional */`,
      handlers: `/**
 * Map of tool name to handler. Keys must match entries in
 * \`PluginManifest.tools\`. The host rejects calls to missing handlers.
 */`,
    },
  },
  RuntimePluginFactory: {
    leading: `/**
 * Factory function exported (as default) from a plugin's \`entry\` module.
 * The host invokes the factory once with a \`PluginRuntimeContext\` and
 * expects a \`RuntimePlugin\` (possibly asynchronously).
 *
 * @example
 * const factory: RuntimePluginFactory = async (ctx) => ({
 *   async start() { ctx.log("ready"); },
 *   handlers: {
 *     my_plugin_ping: async () => ({ ok: true }),
 *   },
 * });
 * export default factory;
 */`,
  },
};

/**
 * Inject English JSDoc blocks into sanitized SDK output.
 *
 * For each entry in the catalog:
 * 1. Insert \`leading\` JSDoc immediately before the declaration header
 *    (matched by \`export (interface|type|const|class|enum) NAME\`). Skips
 *    declarations already directly preceded by a JSDoc block so the pass is
 *    idempotent.
 * 2. For object-shaped types with \`fields\`, locate the declaration body
 *    (balanced braces) and insert field JSDoc at the start of each matching
 *    field line, preserving the field's indentation. Fields already
 *    preceded by a JSDoc block are skipped.
 */
function enrichWithJsDoc(text, catalog) {
  let out = text;

  for (const [name, entry] of Object.entries(catalog)) {
    const headerRegex = new RegExp(
      `(^|\\n)([ \\t]*)export[ \\t]+(interface|type|const|class|enum)[ \\t]+${name}\\b`,
      "m"
    );
    const match = out.match(headerRegex);
    if (!match) continue;

    const matchStart = match.index ?? 0;
    const lead = match[1];
    const indent = match[2] ?? "";
    const headerRel = matchStart + lead.length + indent.length;

    // Idempotence: skip if a JSDoc block already ends immediately before this header.
    const before = out.slice(0, headerRel).trimEnd();
    const alreadyDocumented = before.endsWith("*/");

    if (!alreadyDocumented) {
      const block =
        entry.leading
          .split("\n")
          .map((l, i) => (i === 0 ? indent + l : indent + l))
          .join("\n") + "\n";
      out = out.slice(0, headerRel) + block + out.slice(headerRel);
    }

    if (entry.fields) {
      // Re-locate header after potential insertion.
      const reMatch = out.match(headerRegex);
      if (!reMatch) continue;
      const headerAbs = (reMatch.index ?? 0) + reMatch[1].length + (reMatch[2] ?? "").length;
      const braceStart = out.indexOf("{", headerAbs);
      if (braceStart < 0) continue;

      // Find matching closing brace by depth counting.
      let depth = 0;
      let bodyEnd = -1;
      for (let i = braceStart; i < out.length; i++) {
        const ch = out[i];
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            bodyEnd = i;
            break;
          }
        }
      }
      if (bodyEnd < 0) continue;

      const bodyText = out.slice(braceStart + 1, bodyEnd);
      const lines = bodyText.split("\n");

      const newLines = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let handled = false;

        for (const [fieldName, fieldDoc] of Object.entries(entry.fields)) {
          const fieldRe = new RegExp(`^(\\s+)(${fieldName})(\\?)?\\s*:`);
          const fm = line.match(fieldRe);
          if (!fm) continue;

          const fieldIndent = fm[1];

          // Idempotence: skip if previous non-empty line is end of JSDoc.
          let j = newLines.length - 1;
          while (j >= 0 && newLines[j].trim() === "") j--;
          if (j >= 0 && newLines[j].trimEnd().endsWith("*/")) {
            handled = true;
            break;
          }

          const docLines = fieldDoc
            .split("\n")
            .map((l) => fieldIndent + l);
          newLines.push(...docLines);
          handled = true;
          break;
        }

        newLines.push(line);
        void handled;
      }

      const newBody = newLines.join("\n");
      out = out.slice(0, braceStart + 1) + newBody + out.slice(bodyEnd);
    }
  }

  return out;
}

function removeSdkOnlyDeprecatedDeployment(text) {
  return text
    .replace(/^export type DeploymentMode = "managed" \| "user";\r?\n+/m, "")
    .replace(/^export type PluginDeliveryMode = "marketplace" \| "bundle";\r?\n+/m, "")
    .replace(
      /^\s*deployment\?: DeploymentMode;\r?\n/gm,
      "",
    )
    .replace(
      /^\s*deliveryMode\?: PluginDeliveryMode;\r?\n/gm,
      "",
    );
}

try {
  const { path: hostPath, source } = resolveHostTypesPath();
  const rendered = render(extract(hostPath));
  const sanitized = sanitizeForPublic(rendered);
  const output = removeSdkOnlyDeprecatedDeployment(enrichWithJsDoc(sanitized, JSDOC_CATALOG))
    .replace(/\r(?!\n)/g, "\n")
    .replace(/^[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
  const target = path.join(ROOT, "src/index.ts");

  // Normalize line endings so CRLF/LF differences don't trigger false drift.
  const normalize = (s) => s.replace(/\r\n/g, "\n");

  if (process.argv.includes("--check")) {
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
    if (normalize(current) !== normalize(output)) {
      console.error("DRIFT DETECTED: src/index.ts differs from regenerated output.");
      process.exit(1);
    }
    console.log("No drift.");
  } else {
    fs.writeFileSync(target, output);
    console.log(`Wrote ${target} (${output.length} bytes) from ${source}`);
  }
} finally {
  if (CLONE_TMP_DIR) {
    fs.rmSync(CLONE_TMP_DIR, { recursive: true, force: true });
  }
}
