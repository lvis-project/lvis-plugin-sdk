#!/usr/bin/env node
/**
 * Extract the host-owned plugin contract into the SDK public surface.
 *
 * WHAT IT SYNCS
 *   lvis-app `src/plugins/types.ts`  (the SOT)
 *     -> this repo's `src/index.ts`  (types only; this generator is its ONLY writer)
 *
 * WHY THE HOST IS THE SOURCE
 *   The host owns the plugin contract. The SDK re-publishes it as a typed mirror
 *   so plugin authors can compile against the same declarations the host runs.
 *   The SDK has no authority here and holds no runtime logic: manifest schema
 *   validation lives in the host (`runtime/manifest-validation.ts`), so this file
 *   emits type declarations and nothing else. Anything that would need to EXECUTE
 *   at plugin runtime belongs in the host or in the plugin, never here.
 *
 * WHO CONSUMES THE OUTPUT
 *   Every plugin repo (`@lvis/plugin-sdk` pinned to a git tag) — all of them
 *   `import type` only. `.github/workflows/drift-check.yml` re-runs this script
 *   against host `main` and fails the PR when the committed output is stale.
 *
 * Usage:
 *   node scripts/sync-from-host.mjs              # write src/index.ts
 *   node scripts/sync-from-host.mjs --check      # exit 1 if regenerated output differs from committed
 *
 * Host source resolution (in order):
 *   1. LVIS_HOST_REPO_ROOT env var pointing to a local lvis-app checkout.
 *   2. LVIS_HOST_TYPES_PATH env var pointing to a local src/plugins/types.ts file.
 *   3. Git clone via LVIS_HOST_REPO_URL + HOST_REF (default branch: main).
 *   4. ../lvis-app sibling checkout (implicit dev convenience fallback).
 *
 * Precedence: explicit env-configured URL clone (3) wins over implicit
 * sibling-checkout discovery (4). Issue #106 — CI / hermetic builds pin
 * via the URL+REF env vars; if a dev machine also has a sibling
 * `lvis-app/` checkout, the implicit fallback must not silently shadow
 * the explicit pin.
 * If none is available, the script errors out.
 */

import ts from "typescript";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let CLONE_TMP_DIR = null;

const SAFE_REPO_HOST_ALLOWLIST = new Set([
  "github.com",
  "codeload.github.com",
]);

function assertSafeRepoUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(
      `LVIS_HOST_REPO_URL is not a valid URL: ${rawUrl}`,
    );
  }
  if (parsed.protocol !== "https:") {
    throw new Error(
      `LVIS_HOST_REPO_URL must use https:// (got ${parsed.protocol}). Refusing to clone.`,
    );
  }
  if (!SAFE_REPO_HOST_ALLOWLIST.has(parsed.hostname)) {
    throw new Error(
      `LVIS_HOST_REPO_URL host ${parsed.hostname} is not allowlisted. Allowed: ${[...SAFE_REPO_HOST_ALLOWLIST].join(", ")}.`,
    );
  }
  if (parsed.username || parsed.password) {
    throw new Error(
      `LVIS_HOST_REPO_URL must not carry userinfo (user:pass@host). Strip credentials and use git's credential helper instead.`,
    );
  }
  if (parsed.port) {
    throw new Error(
      `LVIS_HOST_REPO_URL must not carry an explicit port (got :${parsed.port}).`,
    );
  }
}

function assertSafeGitRef(ref) {
  if (!/^[A-Za-z0-9._\/-]+$/.test(ref) || ref.startsWith("-")) {
    throw new Error(
      `HOST_REF contains characters outside the safe set or starts with '-': ${ref}`,
    );
  }
}

function buildHostSources(hostRoot, source) {
  const typesPath = path.join(hostRoot, "src/plugins/types.ts");
  if (!fs.existsSync(typesPath)) {
    console.error(
      `ERROR: host contract file not found under ${hostRoot}. Expected src/plugins/types.ts.`
    );
    process.exit(1);
  }
  return { typesPath, source };
}

function resolveHostSources() {
  const envRoot = process.env.LVIS_HOST_REPO_ROOT;
  if (envRoot && fs.existsSync(envRoot)) {
    return buildHostSources(envRoot, `env-root:${envRoot}`);
  }

  const envPath = process.env.LVIS_HOST_TYPES_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return {
      typesPath: envPath,
      source: `env:${envPath}`,
    };
  }

  // Precedence: explicit env-configured URL clone wins over implicit
  // sibling-checkout discovery (issue #106). Reasoning: CI / hermetic
  // build environments set LVIS_HOST_REPO_URL + HOST_REF on purpose to
  // pin the contract source. If a dev machine *also* happens to have a
  // sibling `lvis-app/` checkout (common during cross-repo work), the
  // implicit sibling should NOT silently shadow the explicit pin —
  // otherwise CI and local sync diverge. Sibling-checkout is the fallback
  // when no explicit env is set.
  const url = process.env.LVIS_HOST_REPO_URL;
  if (url) {
    assertSafeRepoUrl(url);
    const ref = process.env.HOST_REF || "main";
    assertSafeGitRef(ref);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "host-types-"));
    CLONE_TMP_DIR = tmp;
    try {
      execFileSync(
        "git",
        ["clone", "--depth", "1", "--branch", ref, url, tmp],
        { stdio: "inherit" },
      );
    } catch (e) {
      console.error(`Failed to clone ${url}.`);
      throw e;
    }
    return buildHostSources(tmp, `clone@${ref}`);
  }

  const siblingRoot = path.resolve(ROOT, "..", "lvis-app");
  if (fs.existsSync(siblingRoot)) {
    return buildHostSources(siblingRoot, `sibling:${siblingRoot}`);
  }

  console.error(
    "ERROR: host contract source not configured. Set LVIS_HOST_REPO_ROOT, set LVIS_HOST_TYPES_PATH, place lvis-app next to this repository, or set LVIS_HOST_REPO_URL (and optionally HOST_REF) to clone the host repository."
  );
  process.exit(1);
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

/**
 * Hand-maintained twins of host types that live OUTSIDE `src/plugins/types.ts`
 * (`shared/assistant-context.ts` and `shared/marketplace-package-assets.ts`),
 * which the extractor does not read. `PluginMarketplaceItem` references these
 * two types. Plugin-authoring UI resource types live in Host `plugins/types.ts`
 * and are extracted normally so TypeScript and manifest schema cannot diverge.
 */
const HOST_SHARED_TYPE_TWINS = `export type MarketplacePackageType =
  | "plugin"
  | "mcp"
  | "agent"
  | "skill"
  | "provider"
  | "theme"
  | "language-pack";

export type MarketplacePackageAsset =
  | ({ type: "provider"; providerId: string } & Record<string, unknown>)
  | ({ type: "theme"; bundleId: string } & Record<string, unknown>)
  | ({ type: "language-pack"; locale: string } & Record<string, unknown>);`;

function render(body) {
  // NOTE: `sanitizeForPublic` only preserves the first 5 lines as the banner —
  // keep this header at or under that, or it gets truncated mid-sentence.
  return `// AUTO-GENERATED — DO NOT EDIT. Regenerate via: bun run sync:from-host
//
// @lvis/plugin-sdk — public surface of the LVIS plugin contract, mirrored from
// the host. The SDK adds no logic of its own: the host owns manifest validation,
// and the only runtime values below are the host's own error classes + codes.

${HOST_SHARED_TYPE_TWINS}

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
 * The referenced tool names (\`statusTool\`, \`loginTool\`, \`logoutTool\`)
 * identify pure MCP Tool entries. Auth tools are host-initiated UI actions,
 * so declare them with \`_meta.ui.visibility: ["app"]\`, not the model
 * surface. On state transitions the plugin SHOULD emit
 * \`<pluginId>.auth.changed\` so the host UI refreshes without polling.
 */`,
    fields: {
      label: `/** Human-readable label shown next to the badge (defaults to plugin \`name\`). @optional */`,
      statusTool: `/** Name of an app-visible Tool returning {@link PluginAuthStatus}. */`,
      loginTool: `/** Name of an app-visible Tool the host invokes when the user clicks "로그인". The plugin owns the actual auth flow (e.g. MSAL interactive, openAuthWindow). */`,
      logoutTool: `/** Optional app-visible Tool the host invokes when the user clicks "로그아웃". Omit when the plugin has no programmatic sign-out path. @optional */`,
      partitionDomains: `/** Hostnames the plugin may open in its \`persist:plugin-auth:<pluginId>\` partition via {@link PluginHostApi.openAuthPartitionViewer}. Dot-boundary suffix-match — \`outlook.office.com\` matches \`mail.outlook.office.com\` but not \`outlook.office.com.attacker.com\`. Wildcards, single-label hosts, public suffixes (\`com\`, \`co.kr\`), URL-paste, and IDN-punycode are rejected at load time. Max 16 entries. @optional */`,
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
 *   tools: [{ name: "my_plugin_ping", inputSchema: { type: "object", properties: {} } }],
 *   description: "One-line summary shown to the host LLM and in plugin catalogues.",
 * };
 */`,
    fields: {
      id: `/** Globally unique identifier. Reverse-DNS style recommended (for example \`com.example.my-plugin\`). Must be stable across versions. */`,
      name: `/** Human-readable display name shown in the host UI and plugin pickers. */`,
      version: `/** SemVer version string (for example \`1.2.3\`). Used by the host to detect updates and enforce compatibility. */`,
      entry: `/** Path (relative to the plugin root) to the JavaScript module whose default export is a \`RuntimePluginFactory\`. */`,
      tools: `/** Pure MCP Tool objects exposed to the host. Each \`tool.name\` must match \`^[a-zA-Z_][a-zA-Z0-9_]*$\`; use \`_meta.ui.visibility\` to declare model and/or app reachability. */`,
      description: `/** One-line summary (1-280 chars) of what the plugin does. **Required** since v3.0.0 — the LLM uses this in the inactive-plugin catalogue to decide whether to surface the plugin to the user. */`,
      config: `/** Arbitrary JSON configuration merged into \`PluginRuntimeContext.config\` at startup. Treat as untrusted user data. @optional */`,
      ui: `/** Sidebar / panel UI extensions contributed by this plugin. @optional */`,
      keywords: `/** Skill keywords registered with the host keyword engine. Each entry binds a surface keyword to a \`skillId\` the plugin handles. @optional */`,
      capabilities: `/** Free-form capability tags declared by the plugin (for example \`"calendar"\`, \`"email"\`). Hosts may gate features on these. @optional */`,
      eventSubscriptions: `/** Event type names this plugin subscribes to. The host delivers matching events via \`PluginHostApi.onEvent\`. @optional */`,
      emittedEvents: `/** Event type names this plugin may emit on the host event bus. Used by the host for validation and ownership checks. @optional */`,
      auth: `/** Declarative auth contract — see {@link PluginAuthSpec}. When present, the host renders a generic 미인증 / signed-in badge + login/logout button in Settings. @optional */`,
      notificationEvents: `/** Events that should be surfaced as host notifications. Each entry names the event and maps fields of its payload to notification title and body. @optional */`,
      publisher: `/** Display string identifying the plugin publisher (for example an organization or author). @optional */`,
      packageName: `/** npm package name persisted by the host marketplace service for rollback support. Authored by the marketplace publish pipeline — plugin authors should not set this manually. @optional */`,
      python: `/** Optional Python runtime co-deployment metadata. When \`managedBy\` is \`"lvis-app"\` the host installs the locked requirements file at install time; \`"self"\` lets the plugin manage its own venv. @optional */`,
      author: `/** Plugin author — individual maintainer name or contact (distinct from \`publisher\`). @optional */`,
      uiSlots: `/** Top-level advertisement of UI slot names this plugin participates in. Marketplace metadata only — actual extension binding lives in \`ui[].slot\`. @optional */`,
      startupTimeoutMs: `/** Maximum time in milliseconds the host will wait for \`RuntimePlugin.start\` to resolve. Plugins exceeding this are considered failed. @optional */`,
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
      tools: `/** Preview list of legacy tool names from the marketplace catalog. This is distinct from the installed manifest's MCP \`Tool[]\` wire contract. */`,
      version: `/** Marketplace plugin version represented by this catalog entry. @optional */`,
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
 * Request host overlay staging for a plugin-authored suggestion.
 *
 * Capability-gated by \`host:overlay\` in the plugin manifest; missing
 * capability returns \`{ accepted: false, reason: "capability_denied" }\` (no
 * exception). The host inserts the prompt into chat only after the user accepts
 * the overlay CTA. \`spec.prompt\` MUST be a templated, plugin-owned message —
 * NOT raw third-party content (mail body, transcript). \`spec.source\` MUST match
 * \`^overlay:[a-z][a-z0-9-]*$\`.
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
      openExternalUrl: `/**
 * Open an external URL through the host's preferred-flow policy (in-app
 * webview vs system browser). Plugin remains policy-agnostic — host decides
 * routing based on \`webView.preferredFlow\` setting.
 *
 * Optional — declared as \`?\` so a host build that has not yet wired the
 * delegate returns \`undefined\` for the property. Plugins MUST guard with
 * \`typeof api.openExternalUrl === "function"\`.
 *
 * @optional
 */`,
      getAppPreference: `/**
 * Read a host global preference value. Used when the plugin needs to branch
 * on host-level policy (e.g., OAuth flow type). Plugin private namespace
 * (\`pluginConfigs.*\`) is rejected by the host — only explicitly allowlisted
 * keys resolve.
 *
 * Optional — declared as \`?\` so a host build that has not yet wired the
 * delegate returns \`undefined\` for the property. Plugins MUST guard with
 * \`typeof api.getAppPreference === "function"\`.
 *
 * @optional
 */`,
      openAuthPartitionViewer: `/**
 * Open \`url\` in a hardened BrowserWindow bound to this plugin's
 * \`persist:plugin-auth:<pluginId>\` partition, so the page reuses
 * AAD/OIDC cookies already deposited by the plugin's \`openAuthWindow\`
 * call (silent-SSO, no re-login).
 *
 * Caller binding: the host derives the partition from this HostApi's
 * plugin id. A plugin cannot name or reuse another plugin's partition;
 * its own UI or auth flow must open a viewer through its own HostApi.
 *
 * Preconditions:
 *   - Plugin manifest MUST declare capability \`external-auth-consumer\`.
 *   - Plugin manifest MUST declare a non-empty \`auth.partitionDomains\`
 *     allow-list. \`url\` is rejected unless its host matches the list
 *     via dot-boundary suffix-match.
 *
 * Hardening:
 *   - \`will-navigate\` / \`will-redirect\` cancel navigation outside the
 *     allow-list; \`setWindowOpenHandler\` always denies.
 *   - All downloads from the session are canceled.
 *   - Window runs sandbox=true, contextIsolation=true,
 *     nodeIntegration=false, webSecurity=true, no preload.
 *
 * Throws when capability is missing, \`partitionDomains\` is empty/
 * malformed, or the URL host is not in the allow-list. All open /
 * deny / invalid events are audit-logged by the host.
 */`,
      showOverlay: `/**
 * Show a host-rendered overlay attached to a plugin-initiated long
 * running operation (e.g., async tool call surfacing user-visible
 * progress + optional CTA). Host owns the actual rendering; plugins
 * only describe content + lifecycle callbacks.
 *
 * Returns a \`{ dismiss }\` handle the caller MUST invoke when the
 * underlying operation completes (success or failure) so the host
 * tears down the overlay. Failing to dismiss leaves the overlay
 * pinned until session reload.
 *
 * Requires the enforced \`host:overlay\` capability in \`manifest.capabilities[]\`.
 * \`running: true\` shows spinner + "진행 중…"; \`false\` (default) shows
 * summary + actions.
 *
 * Optional — declared as \`?\` so a host build that has not yet wired the
 * overlay surface returns \`undefined\` for the property. Plugins MUST
 * guard with \`typeof api.showOverlay === "function"\`.
 *
 * @optional
 */`,
    },
  },
  ConversationTriggerSpec: {
    leading: `/** Spec for \`PluginHostApi.triggerConversation()\`. */`,
    fields: {
      prompt: `/** Templated, plugin-owned message. NEVER raw third-party content (mail body, transcript). Recorded into audit. */`,
      source: `/** Origin tag. Must match \`^overlay:[a-z][a-z0-9-]*$\`. */`,
      context: `/** Audit-only side-channel. NOT plumbed into the conversation loop — embed any ID needed by the LLM or tools in \`prompt\` instead. @optional */`,
      visibility: `/** UI mode: \`silent\` / \`summary-only\` (default) / \`user-visible\`. P0 treats all three identically. @optional */`,
      priority: `/** Queueing hint when multiple triggers compete. Audit-only in P0. @optional */`,
      dedupeKey: `/** Suppress duplicate triggers for the same observation; dedupe window enforced by host. @optional */`,
      title: `/** Overlay Runner — display title for the OverlayCard rendered when the host stages the trigger as an overlay item. Plugin-owned text — must NOT contain raw third-party content. Defaults to the source tag with the \`overlay:\` prefix stripped. @optional */`,
      summary: `/** Overlay Runner — one-line summary shown in the OverlayCard body. Plugin-owned text — must NOT contain raw third-party content. Defaults to the first 200 chars of \`prompt\`. @optional */`,
      primaryActionLabel: `/** Overlay Runner — label for the OverlayCard primary action button. Defaults to "지금 답하기" when omitted. @optional */`,
    },
  },
  ConversationTriggerResult: {
    leading: `/** Outcome of \`PluginHostApi.triggerConversation()\`. */`,
    fields: {
      accepted: `/** Whether the trigger was accepted for execution. */`,
      reason: `/**
 * Cause when \`accepted\` is \`false\`:
 *  - \`capability_denied\` — plugin lacks \`host:overlay\`.
 *  - \`invalid_source\` — \`source\` does not match \`^overlay:[a-z][a-z0-9-]*$\`, or \`prompt\` empty/oversized.
 *  - \`duplicate\` — \`dedupeKey\` matched a recent trigger.
 *  - \`rate_limited\` — per-plugin call cap exceeded.
 *  - \`loop_unavailable\` — ConversationLoop not yet bound at boot.
 *
 * @optional
 */`,
      source: `/** Echoed from the request so callers can correlate logs. */`,
      eventId: `/** Overlay Runner — present when \`accepted\` is \`true\` and the trigger was staged as an OverlayItem instead of starting a fresh ConversationLoop. Stable host-minted identifier; plugins use it to correlate subsequent host events (e.g., overlay dismiss, audit entries) with the originating trigger. Absent when \`accepted\` is \`false\`. @optional */`,
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
      start: `/** Invoked while the Host prepares a hidden candidate generation. Limit this hook to reversible, side-effect-free setup. @optional */`,
      onPublished: `/** Invoked after the immutable generation becomes active. Start network discovery, restore persisted sessions, and schedule timers here. A failure degrades the active generation and does not roll the durable pointer back. @optional */`,
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
      // direct (depth-0) members of the interface body. Without this guard a
      // catalog entry's JSDoc (say `PluginManifest.description`) is greedily
      // injected onto any same-named field of a NESTED inline object type too,
      // where it is simply wrong. Strings, comments, and template literals are
      // NOT separately tokenized — for our generated output (no string-literal
      // braces inside type signatures) plain brace counting is sufficient.
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
    );

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
  out = restrictMarketplaceChannelToStable(out);
  out = ensurePluginMarketplaceCatalogFields(out);

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

function findInterfaceBounds(text, interfaceName) {
  const declaration = `export interface ${interfaceName} {`;
  const declarationStart = text.indexOf(declaration);
  if (declarationStart < 0) {
    throw new Error(`${interfaceName} declaration is missing from the generated SDK surface.`);
  }

  const braceStart = text.indexOf("{", declarationStart);
  let depth = 0;
  for (let index = braceStart; index < text.length; index++) {
    if (text[index] === "{") depth++;
    if (text[index] === "}") depth--;
    if (depth === 0) {
      return { braceStart, braceEnd: index };
    }
  }

  throw new Error(`${interfaceName} declaration is not structurally balanced in the generated SDK surface.`);
}

function insertInterfaceFields(text, interfaceName, fields) {
  const { braceEnd } = findInterfaceBounds(text, interfaceName);
  return `${text.slice(0, braceEnd)}${fields.join("\n")}\n${text.slice(braceEnd)}`;
}

function interfaceHasField(text, interfaceName, fieldName) {
  const { braceStart, braceEnd } = findInterfaceBounds(text, interfaceName);
  const body = text.slice(braceStart + 1, braceEnd);
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^\\s*${escaped}(?:\\?)?\\s*:`, "m").test(body);
}

function ensurePluginMarketplaceCatalogFields(text) {
  const fields = [
    ["tools", "  /** Preview list of legacy tool names from the marketplace catalog. This is distinct from the installed manifest MCP Tool array. */\n  tools: string[];"],
    ["defaultConfig", "  /** Default configuration seeded into the plugin on first install. Users may override this. @optional */\n  defaultConfig?: Record<string, unknown>;"],
    ["ui", "  /** UI extensions the plugin will contribute once installed. @optional */\n  ui?: PluginUiExtension[];"],
    ["keywords", "  /** Skill keywords published by the catalog entry. @optional */\n  keywords?: Array<{ keyword: string; skillId: string }>;"],
    ["emittedEvents", "  /** Event names this catalog entry may emit. @optional */\n  emittedEvents?: string[];"],
    ["notificationEvents", "  /** Notification metadata mirrored from the installable manifest. @optional */\n  notificationEvents?: Array<{\n    event: string;\n    titleField?: string;\n    bodyField?: string;\n    bypassFocusGate?: boolean;\n  }>;"],
  ];
  const missing = fields
    .filter(([name]) => !interfaceHasField(text, "PluginMarketplaceItem", name))
    .map(([, declaration]) => declaration);

  return missing.length === 0
    ? text
    : insertInterfaceFields(text, "PluginMarketplaceItem", missing);
}

try {
  const { typesPath, source } = resolveHostSources();
  const rendered = render(extract(typesPath));
  const sanitized = sanitizeForPublic(rendered);
  const output = normalizeSdkTypeOnlySurface(enrichWithJsDoc(sanitized, JSDOC_CATALOG))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
  const targets = [
    { path: path.join(ROOT, "src/index.ts"), output, label: "src/index.ts" },
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
