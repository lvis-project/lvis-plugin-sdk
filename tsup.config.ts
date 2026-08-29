import { defineConfig } from "tsup";
export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "build/tsup": "src/build/tsup.ts",
    "packages": "src/packages.ts",
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
  // `ajv` is the optional peer behind `@lvis/plugin-sdk/packages` for the same
  // reason: consumers that only want the schema files never load it.
  external: ["tsup", "ajv"],
});
