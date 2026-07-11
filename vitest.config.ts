import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}", "__tests__/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 10000,
    // Pin vitest's default `forks` pool explicitly so a contributor can't
    // silently switch to `pool: "threads"` with `isolate: false` and
    // reintroduce cross-file module-state bleed between test files.
    pool: "forks",
  },
});
