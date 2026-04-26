import { defineConfig } from "vitest/config";

/**
 * Local vitest config — stops vitest's upward config search so it does not
 * accidentally inherit the parent host repo's `vitest.config.ts`
 * (which references a `vitest.globalSetup.ts` that does not exist relative
 * to this package and crashes test startup).
 *
 * The plugin-sdk only ships pure-TS tests for `src/keys.ts`; no jsdom,
 * no global setup, no environment matching needed.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
