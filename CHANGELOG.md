# Changelog

All notable changes to `@lvis/plugin-sdk` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.6.0] - 2026-05-04

### Added

- **`PluginBridgeConfig`** — IPC-backed config namespace (`bridge.config`).
  Async `get` / `set` / `delete` over `lvis:plugin:config:*` IPC channels.
  Distinct from `PluginHostApi.config` (synchronous manifest-merged config) —
  this is a persisted, user-editable key-value store backed by the host config
  service.

- **`PluginBridgeStorage`** — IPC-backed storage namespace (`bridge.storage`).
  Async `get` / `set` / `delete` / `list` over `lvis:plugin:storage:*` IPC
  channels. Simpler key-value interface than `PluginHostApi.storage`
  (filesystem-level plugin storage).

- **`PluginBridgeAgentApproval`** — Agent-approval response channel
  (`bridge.agentApproval`). `respond(approvalId, decision, note?)` posts to
  `lvis:plugin:agentApproval:respond` to close the §8 ApprovalGate round-trip.

- **`PluginBridge`** — Aggregate interface grouping `config`, `storage`, and
  `agentApproval` namespaces. Exposed on `PluginHostApi.bridge`.

### Notes

- Additive only — all existing 3.5.x consumers are unaffected.
- Companion dep bump required for the following plugin repos after this release
  merges: `lvis-plugin-agent-hub`, `lvis-plugin-meeting`,
  `lvis-plugin-local-indexer`, `lvis-plugin-ms-graph`, `lvis-plugin-lge-api`,
  `lvis-plugin-work-proactive`, `lvis-plugin-template`.

---

## [3.5.0] and earlier

See git history (`git log --oneline`) for prior changes.
