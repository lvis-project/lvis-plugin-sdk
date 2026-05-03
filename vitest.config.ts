import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.{test,spec}.ts", "__tests__/**/*.{test,spec}.ts"],
    testTimeout: 10000,
    // Pin per-file isolation. `src/runtime/electron.ts` carries module-
    // level test-seam state (`_testSafeStorageOverride`,
    // `_testShellOverride`); a future switch to `pool: "threads"` with
    // `isolate: false` would let two test files alternately stomp the
    // override and produce flaky "encryption not available" failures.
    // `forks` is vitest's default but we make it explicit so a
    // contributor can't silently regress the contract.
    pool: "forks",
  },
});
