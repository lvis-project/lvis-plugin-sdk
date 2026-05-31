# @lvis/plugin-sdk

**Version: 5.13.0** — Source/type-only SDK for LVIS plugin authors. Provides
the complete plugin contract surface: `PluginManifest`, `PluginHostApi`,
`PluginRuntimeContext`, `RuntimePlugin`. Does not ship runtime code, build
output, lifecycle hooks, or marketplace trust keys.

```ts
import type {
  RuntimePluginFactory,
  PluginHostApi,
  PluginManifest,
} from "@lvis/plugin-sdk";

const createPlugin: RuntimePluginFactory = async ({ hostApi, log }) => ({
  async start() { log("ready"); },
  handlers: {
    my_plugin_ping: async () => ({ ok: true }),
  },
});

export default createPlugin;
```

## Install

Consume the SDK as a Git dependency pinned to a release tag:

```json
{
  "devDependencies": {
    "@lvis/plugin-sdk": "github:lvis-project/lvis-plugin-sdk#v5.13.0"
  }
}
```

No submodule is required.

## Exports

| Subpath | Contents |
|---|---|
| `@lvis/plugin-sdk` | All type contracts (`PluginManifest`, `PluginHostApi`, `PluginRuntimeContext`, `RuntimePlugin`, …) |
| `@lvis/plugin-sdk/ui` | UI primitives barrel (legacy/prototyping) |
| `@lvis/plugin-sdk/ui/components/<Name>` | Per-component subpath (canonical — see below) |
| `@lvis/plugin-sdk/ui/hooks/useTheme` | React hook for live theme |
| `@lvis/plugin-sdk/ui/hooks/primeTheme` | Vanilla theme subscriber |
| `@lvis/plugin-sdk/ui/tokens/inject` | `injectTokenCss` / `applyThemeTokens` / `applyThemeFromHostEvent` |
| `@lvis/plugin-sdk/ui/tokens/validate` | CSS namespace + token allowlist validators |

## Plugin anatomy

A plugin has two artifacts:

1. **`plugin.json`** — declarative manifest parsed by the host before the runtime loads.
2. **Entry module** (`entry` field in manifest) — exports a `RuntimePluginFactory` as default.

### Minimal `plugin.json`

```json
{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "One-line summary (required, 1-280 chars). The LLM reads this.",
  "entry": "dist/index.js",
  "tools": ["my_plugin_ping"]
}
```

### `PluginManifest` — key fields

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Globally unique. Reverse-DNS style recommended (`com.example.my-plugin`). |
| `name` | `string` | Display name. |
| `version` | `string` | SemVer. |
| `description` | `string` | **Required** since v3.0.0. 1-280 chars. LLM-visible. |
| `entry` | `string` | Path relative to plugin root; default export must be `RuntimePluginFactory`. |
| `tools` | `string[]` | Tool names exposed to host LLM. Pattern: `^[a-zA-Z_][a-zA-Z0-9_]*$` — **dots and hyphens are rejected**. |
| `toolSchemas` | `Record<string, ToolSchema>` | Per-tool description, `category`, `pathFields`, `writesToOwnSandbox`, input JSON Schema. |
| `capabilities` | `string[]` | Capability tags (e.g. `"meeting-recorder"`, `"host:overlay"`). Hosts gate features on these. |
| `keywords` | `Array<{keyword, skillId}>` | Skill keywords registered with host keyword engine. |
| `eventSubscriptions` | `string[] \| EventSubscription[]` | Events the plugin listens to via `hostApi.onEvent`. |
| `emittedEvents` | `string[]` | Events the plugin emits via `hostApi.emitEvent`. Declare all emitted events here. |
| `notificationEvents` | `Array<{event, titleField?, bodyField?, bypassFocusGate?}>` | Events surfaced as host OS notifications. |
| `ui` | `PluginUiExtension[]` | Sidebar/panel UI extensions. Currently `slot: "sidebar"` only. |
| `uiCallable` | `string[]` | Runtime methods the UI may invoke directly (bypassing LLM). UI-only methods belong here and must not be duplicated in `tools`. Use sparingly. |
| `auth` | `PluginAuthSpec` | Declarative auth contract for OAuth/cookie flows. `statusTool`/`loginTool`/`logoutTool` must also appear in `uiCallable[]`. |
| `configSchema` | `PluginConfigSchema` | JSON Schema draft-07 subset; `format: "secret"` routes values through the encrypted keychain. |
| `dependencies` | `Array<string \| DependencySpec>` | Plugin-level dependencies (other plugin ids). |
| `pluginAccess` | `PluginAccessSpec` | Cross-plugin tool/event access grants. |
| `publisher` | `string` | Non-empty string. Required for marketplace submissions. |
| `startupTimeoutMs` | `number` | Max ms host waits for `start()` to resolve. |
| `python` | `{managedBy?, requirementsLock?, interpreter?}` | Python co-deployment metadata for plugins with Python workers. |

### Tool tool category + path fields

`toolSchemas[name].category` is **required** — no default. Host rejects tools without it.

| Category | Meaning |
|---|---|
| `"read"` | Read-only access |
| `"write"` | Write access to plugin's own sandbox |
| `"shell"` | Shell-level operations |
| `"network"` | Network I/O |

`pathFields?: string[]` — list of input schema property names that contain filesystem paths. The host uses these to enforce the `~/.lvis/plugins/<pluginId>/` boundary.

`writesToOwnSandbox?: boolean` — self-attestation that write paths stay inside `~/.lvis/plugins/<pluginId>/`. The host verifies this at call time and downgrades the approval tier to LOW when true.

## `PluginRuntimeContext`

The context object passed by the host to `RuntimePluginFactory`:

```ts
interface PluginRuntimeContext {
  pluginId: string;        // matches manifest.id
  pluginRoot: string;      // absolute path to plugin install dir (read-safe)
  hostRoot: string;        // absolute path to host working dir (avoid direct writes)
  pluginDataDir: string;   // ~/.lvis/plugins/<pluginId>/ — plugin's private data dir
  config?: Record<string, unknown>; // manifest defaults merged with user overrides
  log: (message: string, meta?: unknown) => void; // scoped logger (prefix = pluginId)
  hostApi: PluginHostApi;
}
```

Plugin data is stored under `~/.lvis/plugins/<pluginId>/`. Do not read or write outside this directory without going through a host API method.

## `PluginHostApi` — full surface

```ts
interface PluginHostApi {
  // ── Config (reactive) ─────────────────────────────────────────────────────
  config: {
    get<T = unknown>(key: string): T | undefined;
    set<T = unknown>(key: string, value: T): Promise<void>;
    onChange<T = unknown>(key: string, cb: (value: T | undefined) => void): () => void;
  };

  // ── Storage (scoped to pluginDataDir) ─────────────────────────────────────
  storage: PluginStorage; // read / write / exists / mkdir — all paths relative to pluginDataDir

  // ── Keywords ──────────────────────────────────────────────────────────────
  registerKeywords(keywords: Array<{ keyword: string; skillId: string }>): void;

  // ── Events ────────────────────────────────────────────────────────────────
  emitEvent(eventType: string, data?: unknown): void;
  onEvent(eventType: string, handler: (data: unknown) => void): () => void; // returns unsubscribe fn

  // ── Plugin lifecycle ──────────────────────────────────────────────────────
  getInstalledPluginIds(): string[];                                         // excludes caller
  onPluginsChanged(handler: (event: PluginLifecycleEvent) => void): () => void;

  // ── Secrets (Electron safeStorage) ────────────────────────────────────────
  getSecret(key: string): string | null;

  // ── LLM API key resolution ─────────────────────────────────────────────────
  resolveApiKey?(opts: {
    purpose: "llm" | "stt" | "embedding" | "vision";
    vendor?: "openai" | "azure-openai" | "vertex" | "anthropic";
    signal?: AbortSignal;
  }): Promise<{ ok: true; vendor: string; bearer: () => string } | { ok: false; error: string; message: string }>;

  // ── Overlay / conversation trigger ────────────────────────────────────────
  triggerConversation(spec: ConversationTriggerSpec): Promise<ConversationTriggerResult>;

  // ── Auth window ───────────────────────────────────────────────────────────
  openAuthWindow(options: OpenAuthWindowWithFinalUrlOptions): Promise<OpenAuthWindowFinalUrlResult>;
  openAuthWindow(options: OpenAuthWindowCookieOptions): Promise<AuthWindowCookie[]>;
  openAuthPartitionViewer(pluginId: string): Promise<void>;

  // ── Logging ────────────────────────────────────────────────────────────────
  log(level: "info" | "warn" | "error", message: string, data?: unknown): void;

  // ── Shutdown ───────────────────────────────────────────────────────────────
  onShutdown(handler: () => void | Promise<void>): void;
}
```

## `RuntimePlugin` lifecycle

```ts
interface RuntimePlugin {
  start?: () => Promise<void> | void;  // async setup — connections, state restore
  stop?: () => Promise<void> | void;   // flush state, release resources
  handlers: Record<string, PluginToolHandler>; // keys must match manifest.tools
}
```

Call `hostApi.onEvent` unsubscribe functions and release resources in `stop()`.

## Event naming convention

Events are **dot-delimited** strings. Plugin-emitted events must be namespaced
under the plugin's own id to avoid collisions:

```
<manifest.id>.<verb>.<noun>
```

Examples:
- `com.example.my-plugin.task.created`
- `com.example.my-plugin.auth.changed`  ← required when `auth` spec is declared (§9.4a)

The namespace `plugin.*` is reserved by the host — `hostApi.emitEvent("plugin.installed", ...)` is rejected.

No underscore↔hyphen normalization is applied: the string you emit must exactly
match the string subscribers register with `onEvent`.

## Auth event contract

When a plugin declares an `auth` spec in its manifest, it **must** include
`<pluginId>.auth.changed` in `emittedEvents[]` and emit it from all login/logout
and auth-state-change paths. The host settings badge polls by event, not by
timer — omitting the event means the UI never refreshes after login.

## Schema source-of-truth (US-A1)

`schemas/plugin-manifest.schema.json` is a **byte-equality copy** of
`lvis-app/schemas/plugin.schema.json`. A plugin that passes SDK validation will
pass host validation and vice versa.

- The host repo (`lvis-app`) is the canonical source of truth.
- SDK schema is regenerated by `scripts/sync-schema-from-host.mjs`.
- `drift-check` CI workflow runs nightly and on every PR; fails when SDK types
  or schema diverge from the host.
- To regenerate locally:

  ```bash
  LVIS_HOST_SCHEMA_PATH=/path/to/lvis-app/schemas/plugin.schema.json \
    bun run sync:schema-from-host
  ```

Both schemas use JSON Schema **draft-07** (the dialect AJV strict-mode enforces
in the host's runtime validator).

## Plugin CSS namespace validator

Every plugin-local CSS custom property must carry a 2-3 lowercase-letter
namespace prefix (e.g. `--pm-accent-bg` for a `pm`-prefixed plugin). The
`--lvis-*` namespace is owned by the host — plugins must not define tokens in
that namespace.

### CI enforcement

```json
{
  "scripts": {
    "check:plugin-css": "node node_modules/@lvis/plugin-sdk/scripts/check-plugin-css.mjs"
  }
}
```

```yaml
- name: Check CSS namespace
  run: bun run check:plugin-css
```

### Programmatic API

```ts
import { validatePluginCssNamespace } from "@lvis/plugin-sdk/ui/tokens/validate";

const result = validatePluginCssNamespace(css, {
  vendorAllowlist: ["tw", "radix", "shiki"], // default list; extend as needed
  validPrefixes: ["pm"],   // flag any other 2-3-char prefix not in this list
  mode: "warn",            // "error" (default) | "warn"
});
```

### What counts as a violation

| Example | Result |
|---|---|
| `--pm-accent-bg` | OK — valid 2-char prefix |
| `--ah-danger` | OK — valid 2-char prefix |
| `--accent-bg` | Violation — no prefix |
| `--x-color` | Violation — single-char prefix |
| `--pm` | Violation — prefix-only, no suffix |
| `--tw-ring-color` | OK — vendor-allowlisted (`tw`) |
| `--radix-popper-anchor-width` | OK — vendor-allowlisted (`radix`) |

### Environment variables (CI script)

| Variable | Default | Description |
|---|---|---|
| `LVIS_CSS_MODE` | `error` | Set to `warn` for soft mode |
| `LVIS_CSS_FAIL_ON_WARN` | — | Set to `1` to exit 1 even in warn mode |
| `LVIS_CSS_ROOTS` | `dist,src` | Comma-separated scan roots |
| `LVIS_CSS_VENDOR` | (default list) | Override vendor allowlist (comma-separated) |
| `LVIS_CSS_PREFIXES` | (default list) | Override valid plugin prefix list |

## UI token allowlist (build-time validator)

Plugins may only reference the 17 `--lvis-*` design tokens in `LVIS_TOKEN_NAMES`.
Any other `var(--lvis-*)` reference silently renders as the CSS `initial` keyword.

```ts
import { validateTokenUsage, validateTokenDefinitions } from "@lvis/plugin-sdk/ui/tokens/validate";

const css = readFileSync("dist/plugin-ui.css", "utf8");

const usage = validateTokenUsage(css);
if (!usage.ok) {
  console.error("Unknown --lvis-* tokens referenced:", usage.unknown);
  process.exit(1);
}

const defs = validateTokenDefinitions(css); // plugins must not redefine --lvis-* tokens
if (!defs.ok) {
  console.error("Forbidden redefinitions:", defs.forbiddenRedefinitions);
  process.exit(1);
}
```

## UI imports — canonical pattern (5.4.0+)

Use per-component subpath imports. The `./ui` barrel re-exports every component
and each carries an `injectTokenCss()` side effect that bundlers cannot tree-shake.

```ts
// canonical — only the imported components ship in the bundle
import { Stack, Inline } from "@lvis/plugin-sdk/ui/components/Stack";
import { Toggle } from "@lvis/plugin-sdk/ui/components/Toggle";
import { Card } from "@lvis/plugin-sdk/ui/components/Card";

// legacy / prototyping — pulls every component into the bundle
import { Stack, Toggle, Card } from "@lvis/plugin-sdk/ui";
```

Available subpaths (5.4.0+):

- `@lvis/plugin-sdk/ui/components/<Name>` — Badge / Button / Card / Checkbox / Input / Select / Spinner / Stack / Text / Toggle
- `@lvis/plugin-sdk/ui/hooks/useTheme` — React hook wrapping `primeTheme`
- `@lvis/plugin-sdk/ui/hooks/primeTheme` — vanilla theme subscriber (pull + subscribe + paint, multi-document aware)
- `@lvis/plugin-sdk/ui/tokens/inject` — `injectTokenCss` / `applyThemeTokens` / `applyThemeFromHostEvent`

`injectTokenCss` is keyed by stable id — importing from multiple component bundles in the same plugin is safe; the `<style>` element is upserted once.

## Theme events

Subscribe to host theme changes:

```ts
import { applyThemeFromHostEvent } from "@lvis/plugin-sdk/ui/tokens/inject";

hostApi.onEvent("host.theme.changed", (data) => {
  applyThemeFromHostEvent(data as LvisHostThemeEvent);
});
```

`LvisHostThemeEvent` shape (v2, introduced in v5.0.0):

```ts
interface LvisHostThemeEvent {
  bundleId: "tokyo-night" | "midnight" | "forest" | "violet-light" | "violet-dark" | "high-contrast";
  shell: "light" | "dark";
  tokens: LvisTokenMap; // keys are already "--lvis-bg" form — do NOT add prefix
}
```

| bundleId | shell |
|---|---|
| `"tokyo-night"` | `"dark"` |
| `"midnight"` | `"dark"` |
| `"forest"` | `"dark"` |
| `"violet-light"` | `"light"` |
| `"violet-dark"` | `"dark"` |
| `"high-contrast"` | `"dark"` |

## Trust model

Marketplace signing keys are intentionally not part of this SDK:

- `lvis-marketplace` validates and signs uploaded plugin artifacts.
- `lvis-app` owns the marketplace trust anchors and verifies signed artifacts during install/update.
- Plugin repos use this SDK only for authoring types and manifest contracts.

## Tag policy

- `v2.0.0+` tags are immutable release points.
- Pin a specific tag: `github:lvis-project/lvis-plugin-sdk#vX.Y.Z`.
- Each tag push triggers the `release.yml` workflow which creates a GitHub Release with automated release notes.
- Semver: patch for fixes, minor for additive type changes, major for breaking contract changes.

## Releasing a new version

1. Bump `version` in `package.json` following semver.
2. Commit: `chore: release vX.Y.Z`
3. Push the tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
4. The `release` workflow creates the GitHub Release automatically.
5. Notify downstream plugin authors to update their `#vX.Y.Z` pin.

## Changelog highlights

### v5.13.0 (current)

Downstream pin: `github:lvis-project/lvis-plugin-sdk#v5.13.0`

### v5.10.0 Additions (additive — no migration)

MCP auth metadata types added:

- `McpRuntimeSpec.stdio.apiKeyEnv?: string`
- `McpRuntimeSpec.http.apiKeyHeader?` / `allowPrivateNetworks?` / `oauth?: McpOAuthMetadata`
- `interface McpOAuthMetadata` — MCP 2025-06-18 + RFC 8414/7591 fields
- `interface McpAuthMetadata extends McpOAuthMetadata` — `mode` discriminator
- `PluginMarketplaceItem.mcpAuth?: McpAuthMetadata`

**Schema gap (known)**: types are synced; `schemas/plugin-manifest.schema.json`
will be updated via `bun run sync:schema` after the host schema PR merges.
Until then, adding `mcpAuth` to `plugin.json` will be rejected by `additionalProperties: false`.

### v5.0.0 Migration Guide — LvisHostThemeEvent v2 (BREAKING)

The following fields were **removed** from `LvisHostThemeEvent`. No compat alias.

| Removed field | v1 type | v2 replacement |
|---|---|---|
| `theme` | `"light" \| "dark" \| "high-contrast"` | `bundleId` + `shell` |
| `chatTheme` | `"default" \| "lg" \| "purple" \| "orange" \| "blue"` | `bundleId` |
| `codeTheme` | `"light" \| "dark"` | `bundleId` + `shell` |
| `colorScheme` | `string` (optional) | `shell: "light" \| "dark"` |
| `reducedMotion` | `boolean` (optional) | OS-level `prefers-reduced-motion` media query |
| `fonts?.family` | `string` | plugin-managed CSS or future `--lvis-*` font token |

`useTheme(bridge)` users: the hook is updated internally — no code changes needed, just bump the SDK version.

### v3.1.0 Additions (additive — no migration)

- `PluginHostApi.getInstalledPluginIds()` and `onPluginsChanged(handler)` added.
- `PluginLifecycleEvent` discriminated union added: `{type: "installed", pluginId, source: "marketplace" | "local-dev"}` / `{type: "uninstalled", pluginId}`.
- `plugin.*` event namespace reserved for host — plugin-side emit is rejected.

### v3.0.0 Migration Guide (breaking)

- `description` is now **required** in every `plugin.json`.
- `eventPublishes` removed — use `emittedEvents` exclusively.
- `permissions` top-level field removed (`additionalProperties: false` enforced).
- `python` field added (optional) for plugins with Python workers.
- `publisher` requires `minLength: 1` — empty string fails validation.

### `$schema` URL migration

```diff
- "$schema": "https://sdk.lvis.com/schemas/plugin.schema.json",
+ "$schema": "https://sdk.lvisai.xyz/schemas/plugin.schema.json",
```

Both URLs validate during the deprecation window. The legacy URL will be rejected at the next major release.

### Upgrading

```bash
# bun (recommended)
bun add -d github:lvis-project/lvis-plugin-sdk#v5.13.0

# npm
npm install --save-dev github:lvis-project/lvis-plugin-sdk#v5.13.0
```

After upgrading, validate your `plugin.json` against:
`node_modules/@lvis/plugin-sdk/schemas/plugin-manifest.schema.json`
