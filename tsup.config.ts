import { defineConfig } from "tsup";
export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "ui/index": "src/ui/index.ts",
    "ui/tokens/index": "src/ui/tokens/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["react", "react-dom"],
});
