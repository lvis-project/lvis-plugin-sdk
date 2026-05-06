# Changelog

All notable changes to `@lvis/plugin-sdk` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.2.0] - 2026-05-06

### Added — Icon primitive + curated lucide subset (PR3 of SDK UI roadmap)

- **`Icon`** — `<Icon name="folder" size={16} />` with an 88-name
  allowlist curated from real plugin needs across all 5 LVIS plugin
  domains. The 10 names migrated 1:1 from lvis-plugin-local-indexer's
  hand-rolled ICONS dict (search / folder / document / refresh / play /
  stop / plus / trash / empty / spark) plus 78 forward-compat additions:
  - **Media controls**: play / pause / stop
  - **State / form**: check / x / edit / copy / download / upload /
    save / loader / warning / info / error / external-link /
    check-circle / x-circle / circle / circle-dot / minus / file / tag
  - **Navigation**: chevron-up / chevron-down / chevron-left /
    chevron-right / arrow-left / arrow-right
  - **Schedule + time**: calendar / clock / timer / bell / bell-off
  - **People / agent**: user / users / bot / briefcase / home / building
  - **Communication / share**: mail / send / share / link /
    message-square / at-sign / paperclip / reply / forward
  - **Settings + overflow + help**: settings (gear) /
    more-horizontal (kebab) / help-circle
  - **Visibility / security**: eye / eye-off / lock / unlock /
    shield-check
  - **Meeting / call (with mute/off variants)**: video / video-off /
    mic / mic-off / phone / volume-2 / volume-x / volume-off
    (volume-off is a LVIS-side alias for volume-x — name pairs follow
    `<base>-off` convention)
  - **Tables / KPI / data**: filter / trending-up / trending-down /
    bar-chart / activity
  - **Favorites / saved**: star / pin / bookmark
  - **Layout views**: list / layout-grid
  - **Location / system**: map-pin / power / zap / terminal / archive
  - **Feedback**: thumbs-up
- **A11y default** — `aria-hidden="true"` for decorative use; passing
  `aria-label` removes the implicit hidden state, matching lucide-react
  convention.
- **Subpath export** — `@lvis/plugin-sdk/ui/components/Icon` for tree-
  shaking (single component bundle pulls all 24 icon refs but no other
  SDK component CSS).

### Why

Implementation survey across LVIS plugins: 3/5 plugins
(meeting / local-indexer / lge-api) duplicate ~9 lucide-shaped SVGs as
inline `<svg>` strings in vanilla JS. Plus agent-hub / work-proactive
(React) inline their own SVGs case-by-case. Standard primitive removes
the duplication and locks the curated set to a maintained source.

### Dependencies

- `lucide-react@^1.14.0` (ISC) — full library imported but only the
  24 referenced icons survive tree-shaking on consumer bundlers.

### Consumer migration

Vanilla plugins (local-indexer, meeting, lge-api) cannot consume the
React `Icon` primitive directly — their migration to the SDK lands as
part of the vanilla → React + SDK track (project-plugin-theme-migration-plan
memo). Until then, the Icon primitive is consumed by React-native
plugins (work-proactive, agent-hub) on case-by-case need.

---

## [4.1.0] - 2026-05-06

### Added — Modal primitive + useFocusTrap (PR2 of SDK UI roadmap)

- **`Modal`** — `<Modal open onClose title>` with focus trap (via
  `focus-trap` MIT), Esc key, body scroll lock, click-outside dismiss,
  `disableDismiss` for busy states, three sizes (`sm`/`md`/`lg`),
  optional `caption` + `footer` slots, ARIA `role="dialog"` +
  `aria-modal="true"` + `aria-labelledby`/`aria-label` based on whether
  `title` is a plain string.
- **`useFocusTrap(ref, active, options?)`** — direct hook, exposed for
  future dropdown / popover primitives. Wraps `focus-trap` with safe
  defaults (`returnFocusOnDeactivate: true`, no auto-deactivate on
  Esc/click-outside — Modal handles those itself).
- **Subpath exports** — `@lvis/plugin-sdk/ui/components/Modal`,
  `@lvis/plugin-sdk/ui/hooks/useFocusTrap`. Tree-shake-friendly per
  v3.10.0 contract (Modal uses `injectTokenCss` so the 4.0.1 fallback
  ensure-on-inject path covers it automatically).

### Why

Implementation survey across LVIS plugins: 2 hand-rolled modals
(`local-indexer` folder-preview + `agent-hub` ConfirmModal), at least 4
more on the way. agent-hub's existing modal had no focus trap → a11y
hole. Standard primitive removes the duplication and closes the gap.
First consumer migration (agent-hub ConfirmModal) lands as companion PR.

### Dependencies

- `focus-trap@^8.2.0` (MIT) — direct wrap, no `focus-trap-react` shim.

### Companion PR

- `lvis-plugin-agent-hub` — replaces ConfirmModal internals with SDK Modal.

---

## [4.0.1] - 2026-05-05

### Added

- **`ensureFallback()`** — new public export from
  `@lvis/plugin-sdk/ui/tokens/inject`. Idempotent helper that lazily injects
  the `:root` fallback `<style id="lvis-tokens-fallback">` block. Plugins
  that mount custom React shells before any SDK component evaluates can
  pre-warm the fallback by calling `ensureFallback()` directly. Otherwise
  it runs automatically on the first `injectTokenCss` call.

### Refactored — fallback ensure-on-inject (architect P0 follow-up to PR #102)

- **`:root` fallback CSS moves into `inject.ts`** as an ensure-on-first-call
  side effect of `injectTokenCss`. The 10 `import "../tokens/fallback.js"`
  side-effect-import lines that PR #102 added to every component
  module are removed — the requirement collapses from "use injectTokenCss
  AND remember the fallback import" to just "use injectTokenCss" (which
  every component already does for its own CSS).
- `tokens/fallback.ts` becomes a backward-compat shim — it now imports
  the new `ensureFallback` export from `inject.ts` and calls it. Plugin
  authors who imported `@lvis/plugin-sdk/ui/tokens/fallback` directly
  (subpath added in 3.10.0 / re-published in 4.0.0) continue to work unchanged.
- `ensureFallback` is exported from `inject.ts` for advanced consumers
  who want to pre-warm the `<style>` block before any component
  evaluates (e.g., a custom plugin shell that wants tokens applied
  before its own React mount).

### Why

Architect self-review on PR #102 flagged the 10-line copy-paste as a
real maintenance smell — future contributors authoring a new component
have to remember the side-effect import or the fallback drops. Folding
it into `injectTokenCss` makes the contract automatic.

Pure refactor — runtime behavior identical. 201/201 tests pass (4 new
gate-coverage cases added in `inject.test.ts`).

---

## [3.10.0] - 2026-05-05

### Added — per-component subpath exports (tree-shaking optimization)

- **`@lvis/plugin-sdk/ui/components/<Name>`** — each of the 10 UI
  components (Badge, Button, Card, Checkbox, Input, Select, Spinner,
  Stack, Text, Toggle) now ships as its own dist entry with a
  dedicated subpath export. Plugins that import only a few primitives
  (e.g., work-proactive uses Card / Stack / Inline / Toggle / Text /
  Spinner / Badge — 7/10 components, plus useTheme + injectTokenCss
  helpers) can replace the barrel import:

  ```ts
  // before — pulls all 11 component CSS strings into the bundle
  import { Stack, Toggle } from "@lvis/plugin-sdk/ui";

  // after — only Stack + Toggle CSS bundled
  import { Stack, Inline } from "@lvis/plugin-sdk/ui/components/Stack";
  import { Toggle } from "@lvis/plugin-sdk/ui/components/Toggle";
  ```

  Expected impact: lvis-plugin-work-proactive currently bundles every
  UI component (~1 MB barrel output) but uses only 7/11 — switching
  the import sites to subpaths should drop bundle size meaningfully.
  Actual numbers will land with the consumer-side migration PR.
  React + react-dom remain external, host-provided.

- **`@lvis/plugin-sdk/ui/hooks/useTheme`** — direct hook subpath. Useful
  for plugins that consume tokens via DOM query without using SDK
  components.
- **`@lvis/plugin-sdk/ui/tokens/inject`** and **`@lvis/plugin-sdk/ui/tokens/fallback`** —
  helper / fallback subpaths for advanced plugin authors who want to
  invoke `injectTokenCss` directly or pre-load fallback :root tokens
  outside the standard component path.

### Changed

- Each component file now performs a side-effect `import "../tokens/fallback.js"`
  so per-component subpath imports automatically include the `:root`
  fallback (otherwise the fallback would only ship via the `./ui`
  barrel). The bundler dedupes the import when multiple components
  appear in the same plugin bundle.

### Backward compatibility

- The `./ui` barrel keeps working unchanged — existing plugins (like
  the meeting/local-indexer/ms-graph fleet pinned to v3.x) continue
  to receive all components via the barrel re-export. Subpath imports
  are an opt-in optimization, not a breaking change.

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
