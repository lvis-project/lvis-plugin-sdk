/**
 * `assertTestEnvironment` is the safety guard around `__*ForTests` seams
 * exposed via public subpaths (`@lvis/plugin-sdk/runtime/{electron,network}`).
 * The threat-model note in `_test-env.ts` documents the intent — these
 * tests pin every allow-list branch so a refactor cannot quietly drop one
 * and reopen the seam to production callers.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { assertTestEnvironment } from "../runtime/_test-env.js";

describe("assertTestEnvironment", () => {
  const saved = {
    NODE_ENV: process.env.NODE_ENV,
    VITEST: process.env.VITEST,
    LVIS_TEST: process.env.LVIS_TEST,
  };

  beforeEach(() => {
    process.env.NODE_ENV = saved.NODE_ENV;
    process.env.VITEST = saved.VITEST;
    process.env.LVIS_TEST = saved.LVIS_TEST;
  });

  afterEach(() => {
    if (saved.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.NODE_ENV;
    if (saved.VITEST === undefined) delete process.env.VITEST;
    else process.env.VITEST = saved.VITEST;
    if (saved.LVIS_TEST === undefined) delete process.env.LVIS_TEST;
    else process.env.LVIS_TEST = saved.LVIS_TEST;
  });

  it("no-throws under vitest (VITEST=true is the default test-runner signal)", () => {
    process.env.NODE_ENV = "production";
    process.env.VITEST = "true";
    delete process.env.LVIS_TEST;
    expect(() => assertTestEnvironment("__resetXForTests")).not.toThrow();
  });

  it("no-throws when NODE_ENV is not 'production' regardless of VITEST/LVIS_TEST", () => {
    process.env.NODE_ENV = "development";
    delete process.env.VITEST;
    delete process.env.LVIS_TEST;
    expect(() => assertTestEnvironment("__resetXForTests")).not.toThrow();

    process.env.NODE_ENV = "test";
    expect(() => assertTestEnvironment("__resetXForTests")).not.toThrow();
  });

  it("no-throws under production when LVIS_TEST=1 opts in", () => {
    process.env.NODE_ENV = "production";
    delete process.env.VITEST;
    process.env.LVIS_TEST = "1";
    expect(() => assertTestEnvironment("__resetXForTests")).not.toThrow();
  });

  it("throws under production when neither VITEST nor LVIS_TEST is set", () => {
    process.env.NODE_ENV = "production";
    delete process.env.VITEST;
    delete process.env.LVIS_TEST;
    expect(() => assertTestEnvironment("__setSafeStorageForTests")).toThrow(
      /__setSafeStorageForTests: test seam called in production/,
    );
  });

  it("error message includes the seam name so the production caller is locatable", () => {
    process.env.NODE_ENV = "production";
    delete process.env.VITEST;
    delete process.env.LVIS_TEST;
    expect(() => assertTestEnvironment("__resetPrivateDnsProbeInFlightForTests"))
      .toThrow(/__resetPrivateDnsProbeInFlightForTests/);
  });
});
