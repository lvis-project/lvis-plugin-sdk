import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.{test,spec}.ts", "__tests__/**/*.{test,spec}.ts"],
    testTimeout: 10000,
  },
});
