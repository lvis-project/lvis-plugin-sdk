#!/usr/bin/env node
/**
 * Extract the host-owned plugin contract into the SDK public surface.
 *
 * Usage:
 *   node scripts/sync-from-host.mjs              # write src/index.ts + src/ui/tokens/index.ts
 *   node scripts/sync-from-host.mjs --check      # exit 1 if regenerated output differs from committed
 *
 * Host source resolution (in order):
 *   1. LVIS_HOST_REPO_ROOT env var pointing to a local lvis-app checkout.
 *   2. LVIS_HOST_TYPES_PATH env var pointing to a local src/plugins/types.ts file.
 *   3. ../lvis-app sibling checkout.
 *   4. Git clone via LVIS_HOST_REPO_URL + HOST_REF (default branch: main).
 * If none is available, the script errors out.
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

function buildHostSources(hostRoot, source) {
  const typesPath = path.join(hostRoot, "src/plugins/types.ts");
  const tokenContractPath = path.join(hostRoot, "src/shared/plugin-ui-tokens.ts");
  if (!fs.existsSync(typesPath) || !fs.existsSync(tokenContractPath)) {
    console.error(
      `ERROR: host contract files not found under ${hostRoot}. Expected src/plugins/types.ts and src/shared/plugin-ui-tokens.ts.`
    );
    process.exit(1);
  }
  return { typesPath, tokenContractPath, source };
}

function resolveHostSources() {
  const envRoot = process.env.LVIS_HOST_REPO_ROOT;
  if (envRoot && fs.existsSync(envRoot)) {
    return buildHostSources(envRoot, `env-root:${envRoot}`);
  }

  const envPath = process.env.LVIS_HOST_TYPES_PATH;
  if (envPath && fs.existsSync(envPath)) {
    const tokenEnvPath = process.env.LVIS_HOST_TOKEN_CONTRACT_PATH;
    const derivedRoot = path.resolve(path.dirname(envPath), "..", "..");
    const tokenContractPath = tokenEnvPath && fs.existsSync(tokenEnvPath)
      ? tokenEnvPath
      : path.join(derivedRoot, "src/shared/plugin-ui-tokens.ts");
    if (!fs.existsSync(tokenContractPath)) {
      console.error(
        "ERROR: token contract not found. Set LVIS_HOST_TOKEN_CONTRACT_PATH or provide a host root containing src/shared/plugin-ui-tokens.ts."
      );
      process.exit(1);
    }
    return {
      typesPath: envPath,
      tokenContractPath,
      source: `env:${envPath}`,
    };
  }

  const siblingRoot = path.resolve(ROOT, "..", "lvis-app");
  if (fs.existsSync(siblingRoot)) {
    return buildHostSources(siblingRoot, `sibling:${siblingRoot}`);
  }

  const url = process.env.LVIS_HOST_REPO_URL;
  if (!url) {
    console.error(
      "ERROR: host contract source not configured. Set LVIS_HOST_REPO_ROOT, set LVIS_HOST_TYPES_PATH (and optionally LVIS_HOST_TOKEN_CONTRACT_PATH), place lvis-app next to this repository, or set LVIS_HOST_REPO_URL (and optionally HOST_REF) to clone the host repository."
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
  return buildHostSources(tmp, `clone@${ref}`);
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

function renderTokenContract(body) {
  return `// AUTO-GENERATED — DO NOT EDIT. Regenerate via: bun run sync:from-host
//
// @lvis/plugin-sdk — plugin UI token contract mirrored from the host app.

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
  PluginAuthSpec: {
    leading: `/**
 * Optional declarative auth contract for plugins that own their OAuth /
 * cookie / session flow but want the host to render a generic 미인증 /
 * signed-in surface in Settings → 플러그인 설정. See lvis-app
 * \`architecture.md\` §9.4a "Plugin-Owned OAuth — Host UI Surface".
 *
 * The three referenced tool names (\`statusTool\`, \`loginTool\`,
 * \`logoutTool\`) MUST also appear in \`PluginManifest.uiCallable[]\`;
 * the host validates this cross-field at load time. On state
 * transitions the plugin SHOULD emit \`<pluginId>.auth.changed\` so
 * the host UI refreshes without polling.
 */`,
    fields: {
      label: `/** Human-readable label shown next to the badge (defaults to plugin \`name\`). @optional */`,
      statusTool: `/** Name of a uiCallable tool returning {@link PluginAuthStatus}. */`,
      loginTool: `/** Name of a uiCallable tool the host invokes when the user clicks "로그인". The plugin owns the actual auth flow (e.g. MSAL interactive, openAuthWindow). */`,
      logoutTool: `/** Optional uiCallable tool the host invokes when the user clicks "로그아웃". Omit when the plugin has no programmatic sign-out path. @optional */`,
    },
  },
  PluginAuthStatus: {
    leading: `/**
 * Recommended return shape of \`auth.statusTool\`. Plugins MAY return
 * additional fields and the host ignores them. The host parses with a
 * strict \`=== true\` check on \`authenticated\` — values like \`1\` or
 * \`"true"\` are deliberately treated as unauthenticated to surface
 * contract drift.
 */`,
    fields: {
      authenticated: `/** Strict literal \`true\` when the plugin has a usable session; otherwise \`false\`. */`,
      account: `/** Optional human-readable identity (email, login id) shown next to the green badge. Display only — not a stable id. @optional */`,
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
 *   description: "One-line summary shown to the host LLM and in plugin catalogues.",
 * };
 */`,
    fields: {
      id: `/** Globally unique identifier. Reverse-DNS style recommended (for example \`com.example.my-plugin\`). Must be stable across versions. */`,
      name: `/** Human-readable display name shown in the host UI and plugin pickers. */`,
      version: `/** SemVer version string (for example \`1.2.3\`). Used by the host to detect updates and enforce compatibility. */`,
      entry: `/** Path (relative to the plugin root) to the JavaScript module whose default export is a \`RuntimePluginFactory\`. */`,
      tools: `/** Tool names exposed to the host LLM. Each name must match \`^[a-zA-Z_][a-zA-Z0-9_]*$\` — dots and hyphens are not allowed. */`,
      description: `/** One-line summary (1-280 chars) of what the plugin does. **Required** since v3.0.0 — the LLM uses this in the inactive-plugin catalogue to decide whether to surface the plugin to the user. */`,
      config: `/** Arbitrary JSON configuration merged into \`PluginRuntimeContext.config\` at startup. Treat as untrusted user data. @optional */`,
      ui: `/** Sidebar / panel UI extensions contributed by this plugin. @optional */`,
      keywords: `/** Skill keywords registered with the host keyword engine. Each entry binds a surface keyword to a \`skillId\` the plugin handles. @optional */`,
      capabilities: `/** Free-form capability tags declared by the plugin (for example \`"calendar"\`, \`"email"\`). Hosts may gate features on these. @optional */`,
      startupTools: `/** Tools that should be invoked once during plugin startup, before the first user interaction. @optional */`,
      eventSubscriptions: `/** Event type names this plugin subscribes to. The host delivers matching events via \`PluginHostApi.onEvent\`. @optional */`,
      emittedEvents: `/** Event type names this plugin may emit on the host event bus. Used by the host for validation and ownership checks. @optional */`,
      uiCallable: `/** Tools that the UI is permitted to invoke directly (bypassing the LLM). Use sparingly — prefer LLM-mediated calls. @optional */`,
      auth: `/** Declarative auth contract — see {@link PluginAuthSpec}. When present, the host renders a generic 미인증 / signed-in badge + login/logout button in Settings. @optional */`,
      notificationEvents: `/** Events that should be surfaced as host notifications. Each entry names the event and maps fields of its payload to notification title and body. @optional */`,
      publisher: `/** Display string identifying the plugin publisher (for example an organization or author). @optional */`,
      packageName: `/** npm package name persisted by the host marketplace service for rollback support. Authored by the marketplace publish pipeline — plugin authors should not set this manually. @optional */`,
      python: `/** Optional Python runtime co-deployment metadata. When \`managedBy\` is \`"lvis-app"\` the host installs the locked requirements file at install time; \`"self"\` lets the plugin manage its own venv. @optional */`,
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
 *
 * Note: host-internal install-source bookkeeping (\`_devLinked\`,
 * \`installSource\`) is intentionally stripped from the SDK public surface —
 * see \`stripHostInternalRegistryFields()\` in \`scripts/sync-from-host.mjs\`.
 * Plugins should not branch on those fields.
 */`,
    fields: {
      id: `/** Plugin identifier, matching \`PluginManifest.id\`. */`,
      manifestPath: `/** Absolute or host-relative filesystem path to the plugin's \`manifest.json\`. */`,
      enabled: `/** Whether the plugin should be loaded at host startup. Defaults to \`true\` when omitted. @optional */`,
    },
  },
  PluginConfigSchema: {
    leading: `/**
 * §9.2 Track B — declarative settings schema. JSON Schema draft-07 subset
 * rendered as a typed form in the host's \`PluginConfigTab\`.
 * \`format: "secret"\` routes values through the encrypted keychain instead
 * of the cleartext \`pluginConfigs\` map.
 */`,
    fields: {
      $schema: `/** Optional \`$schema\` identifier; informational only. @optional */`,
      properties: `/** Property declarations keyed by config key. */`,
      required: `/** Property keys that must have a value after merging defaults + saved values. @optional */`,
      customPanel: `/** Optional escape hatch — when declared the host renders a custom React panel underneath the auto-generated form. \`entry\` is a path relative to the plugin root; \`exportName\` is the named export to mount. Use sparingly — schema fields cover the common case. @optional */`,
    },
  },
  PluginConfigSchemaProperty: {
    leading: `/** Schema for a single configuration property. */`,
    fields: {
      type: `/** JSON Schema-compatible value type. */`,
      title: `/** Short human-readable label. @optional */`,
      description: `/** Long-form description rendered as helper text. @optional */`,
      default: `/** Default value seeded into the form when no saved value exists. @optional */`,
      enum: `/** Closed list of valid values (renders as Select). @optional */`,
      minimum: `/** Inclusive lower bound for numeric / integer types. @optional */`,
      maximum: `/** Inclusive upper bound for numeric / integer types. @optional */`,
      minLength: `/** Minimum string length. @optional */`,
      maxLength: `/** Maximum string length. @optional */`,
      pattern: `/** Regex the string value must match. @optional */`,
      format: `/** UI/storage hint. \`"secret"\` routes the value through \`hostApi.setSecret\` / \`getSecret\` instead of cleartext config. \`"uri"\`, \`"email"\`, \`"date-time"\` enable typed inputs. @optional */`,
      items: `/** Item schema for \`type: "array"\` properties. @optional */`,
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
 * Start a conversation turn from a proactive plugin signal.
 *
 * Capability-gated by \`conversation-trigger\` in the plugin manifest; missing
 * capability returns \`{ accepted: false, reason: "capability_denied" }\` (no
 * exception). \`spec.prompt\` MUST be a templated, plugin-owned message — NOT
 * raw third-party content (mail body, transcript). \`spec.source\` MUST match
 * \`^proactive:[a-z][a-z0-9-]*$\`.
 */`,
      getInstalledPluginIds: `/**
 * Snapshot of plugin ids currently loaded into the host runtime, in insertion
 * (load) order. The calling plugin's own id is excluded. Treat the result as
 * a SET (\`includes()\`); insertion order is NOT priority and is subject to
 * change. Pair with \`onPluginsChanged\` to react to lifecycle.
 *
 * Capability-gated by \`lifecycle-observer\` in the plugin manifest (advisory
 * in v3.x — not enforced yet, but declare it to stay forward-compatible).
 *
 * @returns Plugin ids of all currently-loaded plugins except the caller.
 */`,
      onPluginsChanged: `/**
 * Subscribe to plugin install / uninstall lifecycle events. Returns an
 * \`unsubscribe()\` disposer; the host also auto-clears the subscription when
 * the calling plugin is disabled.
 *
 * Fires AFTER the host has finished mounting (install) or unmounting
 * (uninstall) the subject plugin — \`getInstalledPluginIds()\` already
 * reflects the new state when the handler runs. Self-events (this plugin
 * being the subject) are filtered out.
 *
 * P0 only delivers \`installed\` and \`uninstalled\`. Future versions may add
 * \`updated\` (version bump). Handlers SHOULD branch with a \`default:\` to
 * stay forward-compatible.
 *
 * The \`installed\` event carries \`source: "marketplace" | "local-dev"\`.
 * Production consumers SHOULD ignore \`source: "local-dev"\` to avoid
 * letting a developer's local test plugin trigger downstream cascades.
 *
 * Capability-gated by \`lifecycle-observer\` in the plugin manifest (advisory
 * in v3.x — not enforced yet, but declare it to stay forward-compatible).
 */`,
    },
  },
  ConversationTriggerSpec: {
    leading: `/** Spec for \`PluginHostApi.triggerConversation()\`. */`,
    fields: {
      prompt: `/** Templated, plugin-owned message. NEVER raw third-party content (mail body, transcript). Recorded into audit. */`,
      source: `/** Origin tag. Must match \`^proactive:[a-z][a-z0-9-]*$\`. */`,
      context: `/** Audit-only side-channel. NOT plumbed into the conversation loop — embed any ID needed by the LLM or tools in \`prompt\` instead. @optional */`,
      visibility: `/** UI mode: \`silent\` / \`summary-only\` (default) / \`user-visible\`. P0 treats all three identically. @optional */`,
      priority: `/** Queueing hint when multiple triggers compete. Audit-only in P0. @optional */`,
      dedupeKey: `/** Suppress duplicate triggers for the same observation; dedupe window enforced by host. @optional */`,
    },
  },
  ConversationTriggerResult: {
    leading: `/** Outcome of \`PluginHostApi.triggerConversation()\`. */`,
    fields: {
      accepted: `/** Whether the trigger was accepted for execution. */`,
      reason: `/**
 * Cause when \`accepted\` is \`false\`:
 *  - \`capability_denied\` — plugin lacks \`conversation-trigger\`.
 *  - \`invalid_source\` — \`source\` does not match \`^proactive:[a-z][a-z0-9-]*$\`, or \`prompt\` empty/oversized.
 *  - \`duplicate\` — \`dedupeKey\` matched a recent trigger.
 *  - \`rate_limited\` — per-plugin call cap exceeded.
 *  - \`loop_unavailable\` — ConversationLoop not yet bound at boot.
 *
 * @optional
 */`,
      source: `/** Echoed from the request so callers can correlate logs. */`,
    },
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

      // Track nesting depth across lines so field re-injection only fires on
      // direct (depth-0) members of the interface body. Without this guard the
      // script greedily injects PluginManifest.fields.description JSDoc onto
      // the inner `toolSchemas[].description` field too — which is the LLM-
      // facing tool description with min length 10, NOT a plugin catalog
      // summary. Strings, comments, and template literals are NOT separately
      // tokenized — for our generated output (no string-literal braces inside
      // type signatures) plain brace counting is sufficient.
      let lineDepth = 0;

      const newLines = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineDepthEntry = lineDepth; // depth at the start of this line
        // Update running depth from this line's brace tally for the next line.
        for (const ch of line) {
          if (ch === "{") lineDepth++;
          else if (ch === "}") lineDepth--;
        }

        let handled = false;

        if (lineDepthEntry === 0) {
          for (const [fieldName, fieldDoc] of Object.entries(entry.fields)) {
            // Match both property form   `  name?: type`
            // and TS method form         `  name(...): ReturnType`
            const escapedName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const fieldRe = new RegExp(`^(\\s+)(${escapedName})(\\?)?\\s*(?::|\\()`);
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

function normalizeSdkTypeOnlySurface(text) {
  let out = text
    .replace(/^export type DeploymentMode = "managed" \| "user";\r?\n+/m, "")
    .replace(/^export type PluginDeliveryMode = "marketplace" \| "bundle";\r?\n+/m, "")
    .replace(
      /^\s*deployment\?: DeploymentMode;\r?\n/gm,
      "",
    )
    .replace(
      /^\s*deliveryMode\?: PluginDeliveryMode;\r?\n/gm,
      "",
    )
    // PluginMethodHandler was a backward-compat alias for PluginToolHandler.
    // The plugins-no-longer-submodules milestone removed all consumers; drop
    // it from the SDK public surface while keeping the host source unchanged.
    .replace(/^export type PluginMethodHandler = PluginToolHandler;\r?\n+/m, "");

  out = out.replace(
    /^export class PluginStorageError extends Error \{\r?\n(?:.*\r?\n)*?^\}\r?\n+/m,
    "",
  );

  if (out.includes("BufferEncoding")) {
    out = out.replace(/\bBufferEncoding\b/g, "StorageEncoding");
    if (!out.includes("export type StorageEncoding")) {
      const storageEncoding = `/**
 * Supported text encodings for PluginStorage read/write operations.
 * Defined explicitly to avoid a dependency on @types/node in the SDK public surface.
 */
export type StorageEncoding =
  | "utf-8"
  | "utf8"
  | "ascii"
  | "base64"
  | "base64url"
  | "hex"
  | "latin1"
  | "binary";

`;
      out = out.replace(/^export interface PluginStorage/m, storageEncoding + "export interface PluginStorage");
    }
  }

  out = stripHostInternalRegistryFields(out);
  out = dropPluginLifecycleEventPayload(out);
  out = restrictMarketplaceChannelToStable(out);
  out = ensurePluginManifestPython(out);
  out = ensurePluginManifestPackageName(out);
  out = ensurePluginManifestAuthor(out);
  out = ensurePluginManifestUiSlots(out);
  out = annotateToolSchemaInner(out);

  return out;
}

/**
 * M10 — the depth-aware field-injection in `enrichWithJsDoc` deliberately
 * skips nested object members so PluginManifest's `description` JSDoc no
 * longer leaks onto the inner `toolSchemas[].description` (which is the
 * LLM-facing tool description with `minLength: 10` per the JSON Schema —
 * NOT a plugin catalog summary). This pass adds back a correct JSDoc on
 * those nested members. Idempotent.
 */
function annotateToolSchemaInner(text) {
  const innerDescDoc =
    "      /** LLM-facing tool description (when/what/returns). Minimum 10 characters per JSON Schema. */";
  const innerVersionDoc =
    "      /** Optional stable SemVer (MAJOR.MINOR.PATCH) for this tool — §6.4 Tool versioning. Falls back to the manifest top-level `version` when omitted. @optional */";
  const innerDeprecatedDoc =
    "      /** Stable SemVer marking the manifest version that deprecated this tool. Triggers a runtime warn on call. @optional */";
  const innerReplacedByDoc =
    "      /** Tool name that supersedes this deprecated tool — host transparently redirects calls. @optional */";

  let out = text;

  out = out.replace(
    /(toolSchemas\?: Record<\s*\n\s*string,\s*\n\s*\{\s*\n)([ \t]+description: string;)/m,
    (_match, head, line) => {
      if (head.includes(innerDescDoc.trim())) return _match;
      return `${head}${innerDescDoc}\n${line}`;
    },
  );
  out = out.replace(
    /(\n)([ \t]+version\?: string;\n)/,
    (_match, lead, line) =>
      out.includes(innerVersionDoc.trim()) ? _match : `${lead}${innerVersionDoc}\n${line}`,
  );
  out = out.replace(
    /(\n)([ \t]+deprecatedSince\?: string;\n)/,
    (_match, lead, line) =>
      out.includes(innerDeprecatedDoc.trim()) ? _match : `${lead}${innerDeprecatedDoc}\n${line}`,
  );
  out = out.replace(
    /(\n)([ \t]+replacedBy\?: string;\n)/,
    (_match, lead, line) =>
      out.includes(innerReplacedByDoc.trim()) ? _match : `${lead}${innerReplacedByDoc}\n${line}`,
  );

  return out;
}

/**
 * M8 — strip host-internal install bookkeeping (`_devLinked`,
 * `installSource`) from the public `PluginRegistryEntry`. Plugins should
 * never branch on those values. Also strips the legacy `installedBy`
 * @deprecated alias for the same reason.
 */
function stripHostInternalRegistryFields(text) {
  return text
    .replace(/^[ \t]+installedBy\?:\s*InstallPolicy;\s*\r?\n/gm, "")
    .replace(/^[ \t]+_devLinked\?:\s*boolean;\s*\r?\n/gm, "")
    .replace(/^[ \t]+installSource\?:\s*PluginRegistryEntryInstallSource;\s*\r?\n/gm, "")
    // Without `installSource` consumers no longer need the union; drop the
    // type alias too so the SDK doesn't ship a dangling export. Match the
    // declaration line by name + RHS shape rather than a hard-coded literal
    // union so this stays correct as host adds/removes install sources
    // (e.g. lvis-app PR #487 dropped `"dev-link"` and the old regex went
    // stale, leaving the type stuck in the SDK surface).
    .replace(
      /^export type PluginRegistryEntryInstallSource = [^;]+;\r?\n+/m,
      "",
    );
}

/**
 * M12 — `PluginLifecycleEventPayload` is the host's internal event-bus
 * mirror of `PluginLifecycleEvent` minus `type`; no SDK consumer ever
 * references it and it conflicts with the canonical
 * `PluginLifecycleEvent`. Drop it from the public surface.
 */
function dropPluginLifecycleEventPayload(text) {
  return text.replace(
    /^export type PluginLifecycleEventPayload =[\s\S]*?\| \{ pluginId: string \};\r?\n+/m,
    "",
  );
}

/**
 * M11 — PR #62 locked the marketplace publish channel to stable-only
 * SemVer (no pre-release / build-metadata suffixes). Until pre-release
 * support comes back for canary, the catalog `channel` field must drop
 * the `"canary"` literal so plugin-side type narrowing matches the
 * publish gate. Reintroduce `"canary"` here in lock-step with whatever
 * change loosens the SemVer regex.
 */
function restrictMarketplaceChannelToStable(text) {
  return text.replace(
    /channel\?: "stable" \| "canary";/g,
    'channel?: "stable";',
  );
}

/**
 * H3 — host `types.ts` is missing the `python?` block that the host's
 * JSON Schema (and pageindex's published `plugin.json`) already accept.
 * Inject it into `PluginManifest` so plugin authors get type-checking
 * parity with what the schema validates. Idempotent — skips when already
 * present.
 */
function ensurePluginManifestPython(text) {
  if (/python\?:\s*\{/m.test(text)) return text;
  return text.replace(
    /(^export interface PluginManifest \{[\s\S]*?)\n\}\n/m,
    (_match, body) =>
      `${body}\n  python?: {\n    managedBy?: "lvis-app" | "self";\n    requirementsLock?: string;\n    interpreter?: string;\n  };\n}\n`,
  );
}

/**
 * M9 — schema accepts `packageName` on installed manifests (the
 * marketplace publish pipeline writes it for rollback support) but the
 * host TS interface doesn't declare it. Inject it on the SDK side so
 * plugin authors validating their own \`plugin.json\` don't see a TS error
 * if they want to surface the field. Idempotent.
 */
function ensurePluginManifestPackageName(text) {
  if (/^\s*packageName\?:\s*string;/m.test(text)) return text;
  return text.replace(
    /(^export interface PluginManifest \{[\s\S]*?)\n\}\n/m,
    (_match, body) => `${body}\n  packageName?: string;\n}\n`,
  );
}

/**
 * Phase-1 schema-master sync — author + uiSlots TS surface.
 *
 * `author` (individual maintainer) lives in the SDK schema even though
 * the host's plugin.schema.json doesn't carry it after the Phase-1 prune.
 * Plugin authors expect a credit field; `publisher` (organization) and
 * `author` (individual) are intentionally distinct. Inject on the SDK
 * side so manifest typings surface it.
 *
 * `uiSlots` is the top-level slot-name advertisement (distinct from
 * the per-extension `ui[].slot` binding). Marketplace metadata only.
 *
 * Both are idempotent — only inject when missing.
 */
function ensurePluginManifestAuthor(text) {
  if (/^\s*author\?:\s*string;/m.test(text)) return text;
  return text.replace(
    /(^export interface PluginManifest \{[\s\S]*?)\n\}\n/m,
    (_match, body) => `${body}\n  /** Plugin author — individual maintainer name or contact (distinct from \`publisher\`). */\n  author?: string;\n}\n`,
  );
}

function ensurePluginManifestUiSlots(text) {
  if (/^\s*uiSlots\?:\s*string\[\];/m.test(text)) return text;
  return text.replace(
    /(^export interface PluginManifest \{[\s\S]*?)\n\}\n/m,
    (_match, body) => `${body}\n  /** Top-level advertisement of UI slot names this plugin participates in. Marketplace metadata only — actual extension binding lives in \`ui[].slot\`. */\n  uiSlots?: string[];\n}\n`,
  );
}

try {
  const { typesPath, tokenContractPath, source } = resolveHostSources();
  const rendered = render(extract(typesPath));
  const sanitized = sanitizeForPublic(rendered);
  const output = normalizeSdkTypeOnlySurface(enrichWithJsDoc(sanitized, JSDOC_CATALOG))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
  const tokenOutput = renderTokenContract(fs.readFileSync(tokenContractPath, "utf8"))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";
  const targets = [
    { path: path.join(ROOT, "src/index.ts"), output, label: "src/index.ts" },
    {
      path: path.join(ROOT, "src/ui/tokens/index.ts"),
      output: tokenOutput,
      label: "src/ui/tokens/index.ts",
    },
  ];

  // Normalize line endings so CRLF/LF differences don't trigger false drift.
  const normalize = (s) =>
    s
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+$/gm, "")
      .trimEnd() + "\n";

  if (process.argv.includes("--check")) {
    for (const target of targets) {
      const current = fs.existsSync(target.path) ? fs.readFileSync(target.path, "utf8") : "";
      if (normalize(current) !== normalize(target.output)) {
        console.error(`DRIFT DETECTED: ${target.label} differs from regenerated output.`);
        process.exit(1);
      }
    }
    console.log("No drift.");
  } else {
    for (const target of targets) {
      fs.writeFileSync(target.path, target.output);
      console.log(`Wrote ${target.path} (${target.output.length} bytes) from ${source}`);
    }
  }
} finally {
  if (CLONE_TMP_DIR) {
    fs.rmSync(CLONE_TMP_DIR, { recursive: true, force: true });
  }
}
