# Changelog

All notable changes to `@lvis/plugin-sdk` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.9.1] - 2026-05-05

### Fixed
- **`:root` token fallback now auto-injects on `@lvis/plugin-sdk/ui` import.**
  Plugin webviews previously rendered SDK components with `var(--lvis-*)`
  resolving to the CSS `initial` keyword (i.e. invisible — Toggle thumb
  white-on-white) during the brief window between mount and the host's
  first `host.theme.changed` broadcast. Observed when entering a plugin
  panel for the first time after app launch — toggling the theme reset
  unstuck it. The fallback module emits a `:root { --lvis-*: ... }`
  block via `injectTokenCss` at module load (matching the values in
  `lvis-tokens.css :root` and the host's `_DARK_BASE` token map) so
  components paint with sensible dark-mode tokens immediately. The
  host's broadcast still wins via inline `style.setProperty` once it
  arrives.

## [3.9.0] - 2026-05-05

### Added
- **`Stack` and `Inline` layout primitives** (PR #98) — first composite
  primitive in the SDK UI. Vertical / horizontal flex containers with
  `gap`, `align`, `justify`, `wrap`, and `as` props. Hardcoded rem
  spacing scale (xs/sm/md/lg/xl) — to be migrated to design tokens
  when a `--lvis-spacing-*` SoT lands.

### Changed (build path)
- **dist/ no longer committed** (PR #99). The `prepare` lifecycle script
  now runs `tsup && tsc -p tsconfig.build.json`, regenerating dist on
  every consumer `bun install`. Eliminates two recurring CI pain points:
  TypeScript-side `.d.ts.map` OS drift between Linux and macOS, and
  the rebase tax on PRs whenever main moved an exported type. Consumer
  install is ~1-2s slower; that cost is dwarfed by the saved PR cycles.

## [3.8.1] - 2026-05-05

### Removed (BREAKING)
- **`PluginHostApi.addTask`** removed from interface (PR #97). Host task
  system removed in lvis-app Phase 4 (PR #551). Plugins that created
  tasks via `addTask` (e.g. meeting plugin) must migrate to agent-hub
  task creation tools.

## [3.8.0] - 2026-05-05

### Added
- **`@lvis/plugin-sdk/ui/tokens/validate`** — new export path. Build-time
  validator for `--lvis-*` CSS-token usage. Pure string-scan (no postcss
  dep). Plugins import from their CI to fail PRs that introduce
  references outside the 17-name `LVIS_TOKEN_NAMES` allowlist or that
  redefine canonical tokens. Functions:
  `findLvisTokenReferences`, `findLvisTokenDefinitions`,
  `validateTokenUsage`, `validateTokenDefinitions`.
- **SDK self-test** (`src/ui/__tests__/sdk-self-token-allowlist.test.ts`)
  — locks every component CSS string against the allowlist, with a
  `validator-bypass guard` that compares raw vs stripped scan to catch
  references hidden inside JSX/JS string literals.
- **`.github/workflows/test.yml`** — first general test workflow on the
  SDK. Runs `bun run test`, `bunx tsc --noEmit`, and a dist-staleness
  guard (`bun run build` + `git status --porcelain -- dist/`) on every
  PR + push to main. Actions SHA-pinned to match `drift-check.yml`.
- `packageManager: bun@1.1.38` pin in `package.json` so local devs and
  CI emit byte-identical dist artifacts.

### Improved
- **Spinner.tsx** — moved `var(--lvis-primary)` from a JSX attribute
  string into a CSS template-literal block injected via
  `injectTokenCss`. JSX attribute strings are erased by the validator's
  `stripCommentsAndStrings` preprocessor, so the prior reference was
  invisible to validation. Behavior identical (same stroke color via
  CSS class).
- Validator regex hardened — case-sensitive allowlist check (CSS
  custom properties are case-sensitive per spec, so `var(--LVIS-bg)`
  is now flagged), declaration-context anchor on `_LVIS_DEF` to skip
  attribute-selector false matches, comment + string-literal stripping
  before scanning.

### Companion repos (recommended sweep after 3.8.0 publish)
- `lvis-plugin-template` — add `check-ui-tokens` script + CI step
  consuming `@lvis/plugin-sdk/ui/tokens/validate`.
- 7 plugin repos (`meeting`, `local-indexer`, `ms-graph`, `lge-api`,
  `work-proactive`, `agent-hub`, plus future ones) — same
  `check-ui-tokens` step. Current scan: zero `var(--lvis-*)` references
  across all plugins, so the validator's introduction is a clean
  forward-looking guard rather than a regression fix.
- `lvis-app` — `docs/references/plugin-tool-schema-design.md` already
  carries the `host.*` host-only-emit row added in PR #94; needs a
  matching "UI styling tokens" section pointing plugin authors at the
  validator (auditor follow-up).
- `lvis-app` — extend `drift-check.yml` to also watch
  `src/ipc/domains/plugins.ts:PLUGIN_TOKEN_NAMES` ↔ SDK
  `LVIS_TOKEN_NAMES` so a one-sided change can't silently diverge
  (architect follow-up).

---

## [3.7.0] - 2026-05-04

### Improved (synced from host SoT)
- bridge.config / bridge.storage / agentApproval namespace types now reflect v0.2.2 host hardening
- pluginAccess.agentApprovalScopes manifest field (added 3.6.0 schema, types in 3.7.0)
- ApprovalChoice union type explicit (was inline string union)

### Drift check
- `bun run sync:from-host` against `lvis-app` v0.2.2 SoT: **no drift** — src/index.ts already in sync

### Companion repos (require sdk dep ref bump after 3.7.0 publish)
- lvis-app
- lvis-plugin-meeting
- lvis-plugin-local-indexer
- lvis-plugin-ms-graph
- lvis-plugin-lge-api
- lvis-plugin-work-proactive
- lvis-plugin-agent-hub
- lvis-plugin-template

---

## [3.6.0] - 2026-05-04

### Added (synced from host SoT — `lvis-app/src/plugins/types.ts`)

- **`PluginHostApi.agentApproval`** — §8 ApprovalGate response channel for
  plugin-side approval round-trip. `respond(approvalId, choice, nonce?, hmac?)`
  closes a previously requested decision flow. Used by `agent-hub` v0.2.0+
  for the `agent_hub_decide_approval_with_host` tool.

- **`AuthWindowCookie`** / **`OpenAuthWindowBaseOptions`** /
  **`OpenAuthWindowWithFinalUrlOptions`** / **`OpenAuthWindowCookieOptions`** /
  **`OpenAuthWindowFinalUrlResult`** — Typed surface for `openAuthWindow` web
  auth flow (final URL or cookie capture mode).

- **`ApprovalChoice`** — Union type for the four-state approval decision
  (`"approved" | "rejected" | "approved-permanent" | "rejected-permanent"`).

### Notes

- Additive only — all existing 3.5.x consumers are unaffected.
- Generated by `bun run sync:from-host` against `lvis-app` v0.2.1 release SoT.
- Companion dep bump required for plugin repos after this release:
  - `lvis-plugin-agent-hub`
  - `lvis-plugin-meeting`
  - `lvis-plugin-local-indexer`
  - `lvis-plugin-ms-graph`
  - `lvis-plugin-lge-api`
  - `lvis-plugin-work-proactive`
  - `lvis-plugin-template`

Closes lvis-plugin-agent-hub#73.
