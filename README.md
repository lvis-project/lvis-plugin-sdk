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
    "@lvis/plugin-sdk": "github:lvis-project/lvis-plugin-sdk#v2.1.0"
  }
}
```

No submodule is required.

### Upgrading

To pull in a new SDK release, update the tag in your `package.json` and reinstall:

```bash
# bun (recommended)
bun update @lvis/plugin-sdk
# or pin explicitly:
bun add -d github:lvis-project/lvis-plugin-sdk#v2.1.0

# npm
npm install --save-dev github:lvis-project/lvis-plugin-sdk#v2.1.0
```

After upgrading, check your `plugin.json` manifest against the updated JSON
schema at `node_modules/@lvis/plugin-sdk/schemas/plugin-manifest.schema.json`.

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
