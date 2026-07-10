import { defineConfig } from "tsup";
export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "build/tsup": "src/build/tsup.ts",
    // `runtime/_test-env` is intentionally NOT a tsup entry — it's an
    // internal helper imported by `runtime/electron` + `runtime/network`,
    // and the splitting:false config inlines it into each consumer's
    // bundle. Keeping it off the entry list also avoids shipping a
    // separately-importable `@lvis/plugin-sdk/runtime/_test-env` artifact.
    "runtime/electron": "src/runtime/electron.ts",
    "runtime/network": "src/runtime/network.ts",
  },
  format: ["esm"],
  // dts emission is delegated to `tsc -p tsconfig.build.json` (see package.json
  // build script). tsup's bundled dts path injects `baseUrl: "."` into the
  // synthetic compile, which TypeScript 6+ rejects with TS5101 — invoking
  // tsc directly avoids that code path entirely.
  dts: false,
  clean: true,
  splitting: false,
  // `tsup` is a peer/dev concern of consumers, not the SDK runtime — keep it
  // external so `@lvis/plugin-sdk/build` doesn't drag the tsup runtime in.
  external: ["tsup"],
});
