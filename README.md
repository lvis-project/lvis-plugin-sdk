# @lvis/plugin-sdk

Minimal authoring package for LVIS plugins.

The Host owns the complete public plugin contract and documentation:

- `lvis-app/src/plugins/public-contract.ts` owns every public declaration,
  runtime ABI value, and JSDoc block.
- `lvis-app/schemas/plugin-manifest.schema.json` owns manifest validation shape.
- this SDK's `src/index.ts` and schema are generated mechanical mirrors.

The SDK does not select declarations, synthesize documentation, define
compatibility aliases, or validate manifests at Host runtime. Marketplace trust
keys and Host-private registry/marketplace DTOs are intentionally excluded by
the Host source boundary.

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
| `@lvis/plugin-sdk/schemas/plugin-manifest.schema.json` | Verbatim Host schema mirror |

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

## Trust And Release

- `lvis-marketplace` validates and signs uploaded artifacts.
- `lvis-app` owns trust anchors and verifies artifacts during install/update.
- Release tags are immutable and carry one
  `Host-Ref: <40-character lvis-app commit SHA>` trailer.
- Release CI validates tests, typecheck, build, source/schema/dist drift, and
  provenance against that exact Host commit before publishing.
