# @lvis/plugin-sdk

Type-only SDK for LVIS plugin authors. Import the host contract in one line:

```ts
import type {
  RuntimePluginFactory,
  PluginHostApi,
  PluginManifest,
} from "@lvis/plugin-sdk";

const createPlugin: RuntimePluginFactory = ({ pluginId, hostApi, config }) => ({
  handlers: {
    hello: async () => "world",
  },
});

export default createPlugin;
```

No runtime code — the package emits `.d.ts` declarations only (`emitDeclarationOnly: true`, no `main` export).

Plugin repos attach this SDK as a **git submodule** at `plugin-sdk/` and reference it via a tsconfig path alias:

```json
// plugin-repo tsconfig.json
"paths": { "@lvis/plugin-sdk": ["./plugin-sdk/src/index.ts"] }
```

See `lvis-plugin-template` for the canonical scaffold.

## Tag Policy (manual discipline — no ruleset enforcement)

This repo is on a **free** GitHub org plan where tag rulesets are unavailable. Tag protection is therefore **manual** and depends on contributor discipline.

**Rules:**
- `v1` is a **moving tag** tracking the latest `v1.x` release. Only repo admins may re-point it. Always use `git push --force-with-lease` (never `--force`).
- `vN.M.P` tags are **immutable**. Never re-point. If a release is broken, cut a new `vN.M.P+1`.
- All consumers (host app, plugins, template) pin to either `v1` (auto-upgrade within major) or a specific `vN.M.P` (frozen).
- Before moving `v1`, run `bun run check:drift` locally and in CI to ensure the new commit is drift-clean.

**Enforcement audit:** The drift-check workflow runs nightly. If it opens an auto-PR, review and merge to keep `v1` current.

**Future upgrade path:** When the org upgrades to GitHub Team/Pro, add a tag ruleset:
```bash
gh api -X POST /repos/<owner>/<repo>/rulesets --input - <<'EOF'
{ "name": "protect-sdk-v-tags", "target": "tag", "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "rules": [{ "type": "deletion" }, { "type": "non_fast_forward" }] }
EOF
```
