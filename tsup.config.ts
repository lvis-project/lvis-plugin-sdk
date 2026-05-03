import { defineConfig } from "tsup";
export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "ui/index": "src/ui/index.ts",
    "ui/tokens/index": "src/ui/tokens/index.ts",
    "build/tsup": "src/build/tsup.ts",
    "runtime/electron": "src/runtime/electron.ts",
  },
  format: ["esm"],
  // dts emission is delegated to `tsc -p tsconfig.build.json` (see package.json
  // build script). tsup's bundled dts path injects `baseUrl: "."` into the
  // synthetic compile, which TypeScript 6+ rejects with TS5101 — invoking
  // tsc directly avoids that code path entirely.
  dts: false,
  clean: true,
  // `tsup` is a peer/dev concern of consumers, not the SDK runtime — keep it
  // external so `@lvis/plugin-sdk/build` doesn't drag the tsup runtime in.
  external: ["react", "react-dom", "tsup"],
});
