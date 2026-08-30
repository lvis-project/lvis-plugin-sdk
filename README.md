# @lvis/plugin-sdk

Minimal authoring package for LVIS plugins.

The Host owns the complete public plugin contract and documentation:

- `lvis-app/src/plugins/public-contract.ts` owns every public declaration,
  runtime ABI value, and JSDoc block.
- `lvis-app/schemas/plugin-manifest.schema.json` owns manifest validation shape.
- this SDK's `src/index.ts` and `schemas/plugin-manifest.schema.json` are
  generated mechanical mirrors.

The SDK does not select declarations, synthesize documentation, define
compatibility aliases, or validate manifests at Host runtime. Marketplace trust
keys and Host-private registry/marketplace DTOs are intentionally excluded by
the Host source boundary.

Two surfaces are SDK-owned rather than mirrored, because the Host never loads
them: the build helper (`./build`) and the skill / agent package schemas
(`./packages`, see [Package Schemas](#package-schemas)).

## Install

Pin a released Git tag:

```json
{
  "devDependencies": {
    "@lvis/plugin-sdk": "github:lvis-project/lvis-plugin-sdk#v11.2.0"
  }
}
```

No submodule is required.

## Exports

| Subpath | Contents |
| --- | --- |
| `@lvis/plugin-sdk` | Mechanical mirror of the Host public contract |
| `@lvis/plugin-sdk/build` | Thin `defineLvisPluginConfig` tsup helper |
| `@lvis/plugin-sdk/packages` | Skill / agent package types and validators (SDK-owned) |
| `@lvis/plugin-sdk/schemas/plugin-manifest.schema.json` | Verbatim Host schema mirror |
| `@lvis/plugin-sdk/schemas/skill-package.schema.json` | Skill package manifest + `SKILL.md` component schema (SDK-owned) |
| `@lvis/plugin-sdk/schemas/agent-package.schema.json` | Agent package manifest + `AGENTS.md` component schema (SDK-owned) |

```ts
import type { RuntimePluginFactory } from "@lvis/plugin-sdk";

const createPlugin: RuntimePluginFactory = async ({ log }) => ({
  async start() {
    log("candidate prepared");
  },
  async onPublished() {
    log("active generation ready");
  },
  handlers: {
    my_plugin_ping: async () => ({ ok: true }),
  },
});

export default createPlugin;
```

Use the generated JSDoc in `@lvis/plugin-sdk` for the authoring API. The
reader-facing development guide and security rationale live in Host:

- `docs/guides/plugin-development.md`
- `docs/references/plugin-tool-schema-design.md`
- `docs/architecture/plugin-contract-v6-design.md`

## Regenerating Mirrors

With a sibling `lvis-app` checkout:

```bash
bun run sync:from-host
bun run sync:schema-from-host
```

With explicit paths:

```bash
LVIS_HOST_CONTRACT_PATH=/path/to/lvis-app/src/plugins/public-contract.ts \
  bun run sync:from-host

LVIS_HOST_SCHEMA_PATH=/path/to/lvis-app/schemas/plugin-manifest.schema.json \
  bun run sync:schema-from-host
```

Drift gates:

```bash
bun run check:drift
bun run check:schema-drift
bun run check:dist-drift
```

`scripts/sync-from-host.mjs` copies the complete Host public module and prepends
only a generated-file banner. `scripts/sync-schema-from-host.mjs` copies the
Host schema. Contract or documentation changes must therefore be made in
`lvis-app` first.

## Build Helper

`@lvis/plugin-sdk/build` is the one deliberately SDK-local surface. It provides
`defineLvisPluginConfig` for producing a self-contained plugin bundle. It does
not change the Host contract.

## Package Schemas

Skills and agents reach users two ways, and the SDK is the single home of the
contract for both:

- **Standalone package** — a directory with `plugin.json` beside `SKILL.md`
  (skill) or `AGENTS.md` (agent), published to the marketplace on its own.
- **Plugin component** — the same `SKILL.md` inside a directory an Agent
  Plugins 1.0.0 `plugin.json` declares under `skills[]`.

`schemas/skill-package.schema.json` and `schemas/agent-package.schema.json`
each describe the component once, in `$defs` (`skillComponent`,
`agentComponent` — the front matter of the component file), and the package
manifest reuses those fields by `$ref`. The Host never loads a package
manifest, so these two files are SDK-owned; `lvis-marketplace` validates
uploads against byte-identical snapshots of them, pinned to an SDK tag.

`@lvis/plugin-sdk/packages` exposes the types and validators (it needs the
optional `ajv` peer):

```ts
import {
  validateSkillPackageManifest,
  validateSkillComponent,
  SKILL_PACKAGE_SCHEMA_URL,
  type SkillPackageManifest,
} from "@lvis/plugin-sdk/packages";

const manifest: SkillPackageManifest = {
  $schema: SKILL_PACKAGE_SCHEMA_URL,
  id: "angular-architect",
  name: "Angular Architect",
  version: "1.1.0",
  description: "Generates Angular standalone components and configures routing.",
  installPolicy: "user",
  triggers: ["angular", "architect"],
};
validateSkillPackageManifest(manifest);           // { valid: true, value }

// SKILL.md front matter — the same definition whether the skill ships
// standalone or bundled under a plugin's `skills[]`.
validateSkillComponent({
  name: "angular-architect",
  description: manifest.description,
  triggers: manifest.triggers,
});
```

An agent package is the same envelope with the agent profile fields
(`model`, `mode`, `tools`, `triggers`) beside an `AGENTS.md`:

```json
{
  "$schema": "https://sdk.lvisai.xyz/schemas/agent.schema.json",
  "id": "engineering-code-reviewer",
  "name": "Code Reviewer",
  "version": "0.1.0",
  "description": "Expert code reviewer focused on correctness and maintainability.",
  "installPolicy": "user",
  "mode": "subagent",
  "tools": ["skill_list", "skill_load"],
  "triggers": ["engineering", "code", "reviewer"]
}
```

`id` is the component slug: it must equal the front matter `name` and the
directory name. `name` on the manifest is the catalog display name.

The slug rule is `^[a-zA-Z0-9_-]+$`, at most 64 characters. Both halves of it
are the host's: the slug becomes a directory segment under the host's skills /
agents directory and a label in the picker, so it has to be path-safe and it
has to be bounded. Nothing else about the spelling is legislated — case,
digits, underscores and hyphens are the author's choice.

## Trust And Release

- `lvis-marketplace` validates and signs uploaded artifacts.
- `lvis-app` owns trust anchors and verifies artifacts during install/update.
- Release tags are immutable and carry one
  `Host-Ref: <40-character lvis-app commit SHA>` trailer.
- Release CI validates tests, typecheck, build, source/schema/dist drift, and
  provenance against that exact Host commit before publishing.
