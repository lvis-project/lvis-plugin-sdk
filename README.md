# @lvis/plugin-sdk

Source/type-only SDK for LVIS plugin authors. The SDK is the plugin contract
surface only; it does not ship runtime code, build output, lifecycle hooks, or
marketplace trust keys.

```ts
import type {
  RuntimePluginFactory,
  PluginHostApi,
  PluginManifest,
} from "@lvis/plugin-sdk";

const createPlugin: RuntimePluginFactory = ({ hostApi }) => ({
  handlers: {
    hello: async () => "world",
  },
});

export default createPlugin;
```

## Install

Consume the SDK as a Git dependency pinned to a release tag:

```json
{
  "devDependencies": {
    "@lvis/plugin-sdk": "github:lvis-project/lvis-plugin-sdk#v5.0.0"
  }
}
```

No submodule is required.

## v5.0.0 Migration Guide — LvisHostThemeEvent v2 (BREAKING)

**다음 필드들이 `LvisHostThemeEvent` 에서 모두 제거되었습니다.**
하위호환 alias 없음 — atomic cutover. 참조 시 TypeScript 컴파일 에러 발생.

| 제거된 필드 | v1 타입 | v2 대체 |
|---|---|---|
| `theme` | `"light" \| "dark" \| "high-contrast"` | `bundleId` + `shell` |
| `chatTheme` | `"default" \| "lg" \| "purple" \| "orange" \| "blue"` | `bundleId` |
| `codeTheme` | `"light" \| "dark"` | `bundleId` + `shell` |
| `colorScheme` | `string` (optional) | `shell: "light" \| "dark"` |
| `reducedMotion` | `boolean` (optional) | OS-level CSS media query (`prefers-reduced-motion`) — SDK 책임 범위 아님 |
| `fonts?.family` | `string` | plugin 자체 폰트 관리 또는 향후 `--lvis-*` font token 예정 |

### 신규 shape

```typescript
interface LvisHostThemeEvent {
  bundleId: "tokyo-night" | "midnight" | "forest" | "violet-light" | "violet-dark" | "high-contrast";
  shell: "light" | "dark";
  tokens: LvisTokenMap; // key 는 이미 "--lvis-bg" 형태 — prefix 추가 불필요
}
```

### 변경 전 → 후

```typescript
// ❌ v1 (제거됨)
bridge.onEvent("host.theme.changed", (data) => {
  const e = data as LvisHostThemeEvent;
  root.setAttribute("data-theme", e.theme);              // 없음
  root.setAttribute("data-chat-theme", e.chatTheme);     // 없음
  root.setAttribute("data-code-theme", e.codeTheme);     // 없음
  // e.colorScheme, e.reducedMotion, e.fonts?.family      // 모두 없음
});

// ✅ v2 — SDK helper 사용 (권장)
import { applyThemeFromHostEvent } from "@lvis/plugin-sdk/ui";

bridge.onEvent("host.theme.changed", (data) => {
  applyThemeFromHostEvent(data as LvisHostThemeEvent);
  // bundleId 검증 + data-theme-bundle/data-shell 속성 설정 + tokens 적용 한 번에 처리
});

// ✅ v2 — 직접 처리 (helper 없이)
bridge.onEvent("host.theme.changed", (data) => {
  const e = data as LvisHostThemeEvent;
  root.setAttribute("data-theme-bundle", e.bundleId);
  root.setAttribute("data-shell", e.shell);
  // tokens 의 key 는 이미 "--lvis-bg" 형태 — `--lvis-${k}` 형태 prefix 추가 금지
  Object.entries(e.tokens).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
});
```

### useTheme 훅 사용자 (변경 없음)

`useTheme(bridge)` 훅은 내부적으로 v2 로 갱신되었습니다. 훅을 그대로 사용하는 plugin 은
**코드 수정 없이** SDK 버전만 `5.0.0` 으로 올리면 됩니다.

`colorScheme` / `reducedMotion` / `fonts.family` 는 `useTheme` 훅이 이전에 DOM에
직접 적용하던 v1 전용 처리입니다 — v2에서 훅은 `bundleId`, `shell`, `tokens` 만 처리합니다.
해당 필드를 참조하는 코드가 있다면 제거하세요. 대체:
- `colorScheme` → `event.shell` (`"light"` / `"dark"`)
- `reducedMotion` → `window.matchMedia("(prefers-reduced-motion: reduce)").matches`
- `fonts.family` → plugin 자체 CSS 변수 또는 향후 `--lvis-*` font token

### bundleId 값

| bundleId | shell | 설명 |
|---|---|---|
| `"tokyo-night"` | `"dark"` | Tokyo Night 다크 테마 |
| `"midnight"` | `"dark"` | Midnight 다크 테마 |
| `"forest"` | `"dark"` | Forest 다크 테마 |
| `"violet-light"` | `"light"` | Violet 라이트 테마 |
| `"violet-dark"` | `"dark"` | Violet 다크 테마 |
| `"high-contrast"` | `"dark"` | 고대비 접근성 테마 |

### `$schema` URL migration (deprecation in progress)

The schema `$id` is moving from `https://sdk.lvis.com/schemas/plugin.schema.json`
to `https://sdk.lvisai.xyz/schemas/plugin.schema.json` as part of the LVIS
domain rename. Plugin authors who hard-code a `$schema` URL in `plugin.json`
should migrate at their next release:

```diff
-  "$schema": "https://sdk.lvis.com/schemas/plugin.schema.json",
+  "$schema": "https://sdk.lvisai.xyz/schemas/plugin.schema.json",
```

Both URLs validate (the field uses `format: uri` rather than a strict enum
today) so plugins migrating during the deprecation window will not fail
validation. The deprecation lasts for **one SDK release**: from v3.2.x the
SDK warns when the legacy URL is detected, and starting at the next major
the schema enum will be tightened to the new URL only. The `applyDollarSchemaMigration`
hook in `scripts/sync-schema-from-host.mjs` is the anchor point for that
follow-up change.

### v5.10.0 Additions (additive — no migration)

**MCP auth metadata types** are new. SDK 가 host 의 MCP 서버 인증 컨트랙트
를 type 형태로 노출:

- `McpRuntimeSpec.stdio` 의 `apiKeyEnv?: string` — host 가 plugin 환경변수
  에서 읽을 API key envvar 이름.
- `McpRuntimeSpec.http` 의 `apiKeyHeader?: string` / `allowPrivateNetworks?:
  boolean` / `oauth?: McpOAuthMetadata`.
- `interface McpOAuthMetadata` — MCP 2025-06-18 + RFC 8414/7591 매핑 필드
  (`resource`, `resourceMetadataUrl`, `authorizationServers`, `scopes`,
  `clientRegistration`).
- `interface McpAuthMetadata extends McpOAuthMetadata` — `mode` discriminator
  추가.
- `PluginMarketplaceItem.mcpAuth?: McpAuthMetadata` — 마켓플레이스 카탈로그
  entry 에 노출.

**Schema gap (known)**: 본 릴리스는 type 만 sync. `schemas/plugin-manifest.schema.json`
은 host 측 schema PR 머지 후 `bun run sync:schema` 로 따라잡을 예정. 즉
현 시점에 plugin manifest 에 `mcpAuth` 적으면 host `additionalProperties:
false` 에 막힘.

### v3.1.0 Additions (additive — no migration)

**`PluginHostApi.getInstalledPluginIds()` and `onPluginsChanged(handler)` are
new.** Brain plugins (e.g. `work-proactive`) can now read the installed
plugin set and subscribe to install/uninstall lifecycle without a host
restart. `getInstalledPluginIds` returns ids in load order — treat as a SET
(`includes()`); insertion order is NOT priority.

**`PluginLifecycleEvent` discriminated union is new.** Handlers receive
`{type: "installed", pluginId, source: "marketplace" | "local-dev"}` or
`{type: "uninstalled", pluginId}`. Self-events filtered by the host. The
union also carries a `_future` sentinel variant — never produced at runtime,
present only to force exhaustive `switch (event.type)` consumers to add a
`default:` branch so future variants (e.g. `"updated"` for version bumps)
don't silently break subscribers.

**`source: "local-dev"` on installs marks the dev-mode local-folder install
path** (LVIS_DEV=1 + Settings → 로컬 폴더에서 설치). Production consumers
SHOULD ignore these so a developer's local test plugin doesn't trigger
downstream cascades.

The companion host change reserves `plugin.*` as a host-only event namespace
— plugin-side `hostApi.emitEvent("plugin.installed", ...)` is rejected so a
plugin cannot spoof lifecycle events to other subscribers.

### v3.0.0 Migration Guide (breaking)

**`description` is now a required MUST field** (was optional). Add a one-line
description to every `plugin.json` if not already present.

**`eventPublishes` is removed** — use `emittedEvents` exclusively. Rename any
`eventPublishes` fields in `plugin.json` to `emittedEvents`. No compat shim.

**`permissions` top-level field is no longer allowed** (`additionalProperties: false`
enforced). Remove any `permissions` arrays from `plugin.json` manifests.

**`additionalProperties: false`** — the schema now rejects unknown manifest keys.
Any undocumented fields in `plugin.json` will cause host load failure. This
includes the previously-accepted `permissions[]` field.

**`python` field added** — the `PluginManifest` interface now includes an
optional `python?: { managedBy?, requirementsLock?, interpreter? }` field for
Python co-deployment metadata (e.g. pageindex). This was already supported at
runtime but was previously undeclared in the type.

**`publisher` requires `minLength: 1`** — an empty-string publisher now fails
schema validation. Either omit the field or provide a non-empty value.

### Upgrading

To pull in a new SDK release, update the tag in your `package.json` and reinstall:

```bash
# bun (recommended)
bun update @lvis/plugin-sdk
# or pin explicitly:
bun add -d github:lvis-project/lvis-plugin-sdk#v3.0.0

# npm
npm install --save-dev github:lvis-project/lvis-plugin-sdk#v3.0.0
```

After upgrading, check your `plugin.json` manifest against the updated JSON
schema at `node_modules/@lvis/plugin-sdk/schemas/plugin-manifest.schema.json`.

## Schema source-of-truth (US-A1)

`schemas/plugin-manifest.schema.json` is a **byte-equality copy** of the host's
`lvis-app/schemas/plugin.schema.json`. A plugin that passes SDK validation
will pass host validation and vice versa.

Sync rules:

- The host repo (`lvis-app`) is the canonical source of truth.
- The SDK schema is regenerated by `scripts/sync-schema-from-host.mjs`.
- The `drift-check` GitHub workflow runs nightly and on every PR; it fails
  CI when the SDK schema (or `src/index.ts` types) differ from the host SoT.
- To regenerate locally:

  ```bash
  LVIS_HOST_SCHEMA_PATH=/path/to/lvis-app/schemas/plugin.schema.json \
    bun run sync:schema-from-host
  ```

Both schemas use JSON Schema **draft-07** (the dialect AJV strict-mode
enforces in the host's runtime validator) so behavior is identical between
authoring-time SDK validation and runtime host validation. Earlier SDK
versions used `draft/2020-12`; v2.2.0 unified on draft-07 to close audit
item HIGH #1 (schema-dialect drift).

## Plugin CSS namespace validator

Every plugin-local CSS custom property (anything that is NOT `--lvis-*`) must
carry a 2-3 lowercase-letter namespace prefix to avoid collisions across
co-loaded plugins (e.g. `--pm-accent-bg` for the meeting plugin).

### Quick start — CI enforcement

Add to your plugin repo's `package.json`:

```json
{
  "scripts": {
    "check:plugin-css": "node node_modules/@lvis/plugin-sdk/scripts/check-plugin-css.mjs"
  }
}
```

Then call it from GitHub Actions:

```yaml
- name: Check CSS namespace
  run: bun run check:plugin-css
```

The script scans `dist/` and `src/` by default. It exits with code 1 when
violations are found, so CI fails automatically.

### Programmatic API

```ts
import { validatePluginCssNamespace } from "@lvis/plugin-sdk/ui/tokens/validate";

const result = validatePluginCssNamespace(css, {
  // Vendor library prefixes exempt from enforcement (default: tw/radix/shiki/reach/vis/react)
  vendorAllowlist: ["tw", "radix", "shiki"],
  // Restrict to this plugin's known prefix(es); any other 2-3-char prefix is also flagged
  validPrefixes: ["pm"],
  // "error" (default): findings → violations[], ok=false
  // "warn":            findings → warnings[], ok=true  (soft mode for gradual rollout)
  mode: "warn",
});

if (!result.ok) {
  console.error("Violations:", result.violations);
}
if (result.warnings.length > 0) {
  console.warn("Warnings:", result.warnings);
}
```

### Environment variables (CI script)

| Variable | Default | Description |
|---|---|---|
| `LVIS_CSS_MODE` | `error` | Set to `warn` for soft mode — findings go to `warnings[]`, exit 0 |
| `LVIS_CSS_FAIL_ON_WARN` | — | Set to `1` to exit 1 even in warn mode |
| `LVIS_CSS_ROOTS` | `dist,src` | Comma-separated directories to scan |
| `LVIS_CSS_VENDOR` | (default list) | Override vendor allowlist (comma-separated prefixes) |
| `LVIS_CSS_PREFIXES` | (default list) | Override valid plugin prefix list (comma-separated) |

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

## UI token allowlist (build-time validator)

Plugin UI must reference only the 17 `--lvis-*` design tokens enumerated in
`LVIS_TOKEN_NAMES`. The host validates the same allowlist at theme-broadcast
time, so any other `var(--lvis-*)` reference would silently render as the CSS
`initial` keyword — invisible regression. The SDK ships a build-time validator
that catches the mistake before publish.

```ts
// plugin's CI script — e.g. scripts/check-ui-tokens.mjs
import { readFileSync } from "node:fs";
import { validateTokenUsage, validateTokenDefinitions } from "@lvis/plugin-sdk/ui/tokens/validate";

const css = readFileSync("dist/plugin-ui.css", "utf8");

const usage = validateTokenUsage(css);
if (!usage.ok) {
  console.error("Unknown --lvis-* tokens referenced:", usage.unknown);
  process.exit(1);
}

const defs = validateTokenDefinitions(css); // allowDefinitions: false (default)
if (!defs.ok) {
  console.error("Plugin must not redefine --lvis-* tokens (host owns them):", defs.forbiddenRedefinitions);
  process.exit(1);
}
```

The validator is a pure string-scan (no postcss / CSS-AST dependency), so it
runs in any Node 18+ context — including a vitest unit test, a `bun run check`
script, or a GitHub Actions step.

The SDK's own `bun run test` self-checks every component CSS string against
the allowlist (`src/ui/__tests__/sdk-self-token-allowlist.test.ts`); a typo
or a stale token entry fails CI immediately.

## UI imports — canonical pattern (5.4.0+)

**Per-component subpath is the canonical import path** for new plugin
code. The `./ui` barrel still works (no breaking change for existing
plugins) but is now considered the "prototyping / legacy" path because
every component module has a top-level `injectTokenCss(...)` side effect
that bundlers cannot tree-shake — importing one component from the
barrel pulls all 10.

```ts
// canonical — only the imported components ship in the bundle
import { Stack, Inline } from "@lvis/plugin-sdk/ui/components/Stack";
import { Toggle } from "@lvis/plugin-sdk/ui/components/Toggle";
import { Card } from "@lvis/plugin-sdk/ui/components/Card";

// legacy / prototyping — pulls every component into the bundle
import { Stack, Toggle, Card } from "@lvis/plugin-sdk/ui";
```

Plugins paint with the host-primed `--lvis-*` tokens shipped on every
BrowserWindow via `webPreferences.additionalArguments`, so components
render with the correct theme from frame 0 without any SDK-side fallback
stylesheet. Subscribe to live theme changes with `primeTheme` (or
`useTheme` under React). `injectTokenCss` is keyed by stable id so
importing it from multiple component bundles in the same plugin is
safe — the `<style>` element is upserted once, never duplicated.

Available subpaths (5.4.0):

- `@lvis/plugin-sdk/ui/components/<Name>` — Badge / Button / Card /
  Checkbox / Input / Select / Spinner / Stack / Text / Toggle
- `@lvis/plugin-sdk/ui/hooks/useTheme` — React hook wrapping `primeTheme`
- `@lvis/plugin-sdk/ui/hooks/primeTheme` — vanilla theme subscriber
  (pull + subscribe + paint, multi-document aware)
- `@lvis/plugin-sdk/ui/tokens/inject` — `injectTokenCss` / `applyThemeTokens` /
  `applyThemeFromHostEvent`

## Trust model

Marketplace signing keys are intentionally not part of this SDK. LVIS follows
the commercial IDE/browser marketplace model:

- `lvis-marketplace` validates and signs uploaded plugin artifacts.
- `lvis-app` owns the marketplace trust anchors and verifies signed artifacts
  during install/update.
- Plugin repos use this SDK only for authoring types and manifest contracts.

## Tag policy

- `v2.0.0+` tags are immutable release points.
- Consumers should pin a specific tag (`github:lvis-project/lvis-plugin-sdk#vX.Y.Z`).
- Each tag push triggers the `release.yml` workflow which creates a corresponding
  GitHub Release with automated release notes.
- Tagging follows semver: patch for fixes, minor for additive type changes,
  major for breaking contract changes.

## Releasing a new version

1. Bump `version` in `package.json` following semver.
2. Commit: `chore: release vX.Y.Z`
3. Push the tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
4. The `release` workflow creates the GitHub Release automatically.
5. Notify downstream plugin authors to update their `#vX.Y.Z` pin.
