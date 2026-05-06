import { defineConfig } from "tsup";
export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "ui/index": "src/ui/index.ts",
    "ui/tokens/index": "src/ui/tokens/index.ts",
    "ui/tokens/validate": "src/ui/tokens/validate.ts",
    "build/tsup": "src/build/tsup.ts",
    "runtime/electron": "src/runtime/electron.ts",
    // Per-component subpath entries — let consumers tree-shake by
    // importing `@lvis/plugin-sdk/ui/components/<Name>` directly. The
    // `./ui/index` barrel still works for backward compat but pulls in
    // every component (each has a module-load `injectTokenCss` side
    // effect, so `export * from` cannot tree-shake them).
    "ui/components/Badge": "src/ui/components/Badge.tsx",
    "ui/components/Button": "src/ui/components/Button.tsx",
    "ui/components/Card": "src/ui/components/Card.tsx",
    "ui/components/Checkbox": "src/ui/components/Checkbox.tsx",
    "ui/components/Icon": "src/ui/components/Icon.tsx",
    "ui/components/Input": "src/ui/components/Input.tsx",
    "ui/components/Modal": "src/ui/components/Modal.tsx",
    "ui/components/Select": "src/ui/components/Select.tsx",
    "ui/components/Spinner": "src/ui/components/Spinner.tsx",
    "ui/components/Stack": "src/ui/components/Stack.tsx",
    "ui/components/Text": "src/ui/components/Text.tsx",
    "ui/components/Toggle": "src/ui/components/Toggle.tsx",
    "ui/hooks/useTheme": "src/ui/hooks/useTheme.ts",
    "ui/hooks/useFocusTrap": "src/ui/hooks/useFocusTrap.ts",
    "ui/tokens/fallback": "src/ui/tokens/fallback.ts",
    "ui/tokens/inject": "src/ui/tokens/inject.ts",
  },
  format: ["esm"],
  // dts emission is delegated to `tsc -p tsconfig.build.json` (see package.json
  // build script). tsup's bundled dts path injects `baseUrl: "."` into the
  // synthetic compile, which TypeScript 6+ rejects with TS5101 — invoking
  // tsc directly avoids that code path entirely.
  dts: false,
  clean: true,
  // Disable code splitting so each per-component subpath produces a
  // single self-contained dist file. Trade-off: slightly more inlined
  // shared code (injectTokenCss / fallback) per component bundle vs.
  // shared `chunk-XXXX.js` files whose content-addressed hashes would
  // otherwise churn between releases — that churn breaks long-term
  // caching at consumer bundlers exactly when the point of this layout
  // is bundle-size predictability. Self-test 197/197 still passes; the
  // size cost is bounded (~1KB token table per bundle).
  splitting: false,
  // `tsup` is a peer/dev concern of consumers, not the SDK runtime — keep it
  // external so `@lvis/plugin-sdk/build` doesn't drag the tsup runtime in.
  external: ["react", "react-dom", "tsup"],
});
