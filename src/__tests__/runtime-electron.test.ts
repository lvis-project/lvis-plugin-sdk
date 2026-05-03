import { describe, it, expect, afterEach } from "vitest";
import {
  getSafeStorage,
  getShell,
  __setSafeStorageForTests,
  __setShellForTests,
} from "../runtime/electron.js";

describe("runtime/electron — safeStorage seam", () => {
  afterEach(() => {
    __setSafeStorageForTests(undefined);
  });

  it("returns null by default outside Electron (no seam)", () => {
    expect(getSafeStorage()).toBeNull();
  });

  it("returns the override when set", () => {
    const mock = {
      isEncryptionAvailable: () => true,
      encryptString: (s: string) => Buffer.from(s),
      decryptString: (b: Buffer) => b.toString(),
    };
    __setSafeStorageForTests(mock);
    expect(getSafeStorage()).toBe(mock);
  });

  it("returns null when override is explicitly null (force-unavailable)", () => {
    __setSafeStorageForTests(null);
    expect(getSafeStorage()).toBeNull();
  });

  it("falls back to real lookup when override is undefined", () => {
    __setSafeStorageForTests({
      isEncryptionAvailable: () => true,
      encryptString: () => Buffer.alloc(0),
      decryptString: () => "",
    });
    __setSafeStorageForTests(undefined);
    expect(getSafeStorage()).toBeNull();
  });
});

describe("runtime/electron — shell seam", () => {
  afterEach(() => {
    __setShellForTests(undefined);
  });

  it("returns null by default outside Electron (no seam)", () => {
    expect(getShell()).toBeNull();
  });

  it("returns the override when set", () => {
    const mock = { openExternal: async () => undefined };
    __setShellForTests(mock);
    expect(getShell()).toBe(mock);
  });

  it("returns null when override is explicitly null", () => {
    __setShellForTests(null);
    expect(getShell()).toBeNull();
  });

  it("does not throw when underlying require fails — returns null", () => {
    // No seam set; createRequire("electron") in this Node-only test
    // process resolves to the npm electron path-string export which has
    // no `.shell` property → wrapped lookup returns null without throw.
    expect(() => getShell()).not.toThrow();
  });
});

describe("runtime/electron — seam isolation", () => {
  afterEach(() => {
    __setSafeStorageForTests(undefined);
    __setShellForTests(undefined);
  });

  it("safeStorage seam does not affect shell seam", () => {
    const safeStorage = {
      isEncryptionAvailable: () => true,
      encryptString: () => Buffer.alloc(0),
      decryptString: () => "",
    };
    __setSafeStorageForTests(safeStorage);
    expect(getSafeStorage()).toBe(safeStorage);
    // shell still uses the real (null) lookup since no seam was set
    expect(getShell()).toBeNull();
  });
});

describe("runtime/electron — production guard", () => {
  // The seam exports are reachable from any plugin via
  // `@lvis/plugin-sdk/runtime/electron`. Without a runtime guard, a
  // buggy or compromised plugin could call them in a packaged build
  // and hijack every other plugin's token storage. The guard throws
  // when NODE_ENV=production and neither VITEST nor LVIS_TEST is set.

  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env for subsequent tests.
    for (const key of ["NODE_ENV", "VITEST", "LVIS_TEST"]) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    __setSafeStorageForTests(undefined);
    __setShellForTests(undefined);
  });

  it("throws when called with NODE_ENV=production and no test signal", () => {
    process.env.NODE_ENV = "production";
    delete process.env.VITEST;
    delete process.env.LVIS_TEST;
    expect(() => __setSafeStorageForTests(null)).toThrow(/test seam called in production/);
    expect(() => __setShellForTests(null)).toThrow(/test seam called in production/);
  });

  it("allows the call when LVIS_TEST=1 even in production builds", () => {
    process.env.NODE_ENV = "production";
    delete process.env.VITEST;
    process.env.LVIS_TEST = "1";
    expect(() => __setSafeStorageForTests(null)).not.toThrow();
    expect(() => __setShellForTests(null)).not.toThrow();
  });

  it("allows the call when VITEST=true (set by vitest itself)", () => {
    process.env.NODE_ENV = "production";
    process.env.VITEST = "true";
    expect(() => __setSafeStorageForTests(null)).not.toThrow();
  });
});

describe("runtime/electron — diagnostic completeness", () => {
  // Coverage gap previously: the `try/catch → null` branches on
  // getSafeStorage / getShell had no explicit test. Without these,
  // a future refactor that removes the catch and re-throws would
  // ship green.
  afterEach(() => {
    __setSafeStorageForTests(undefined);
    __setShellForTests(undefined);
  });

  it("getSafeStorage does not throw even without electron available — null fallback", () => {
    expect(() => getSafeStorage()).not.toThrow();
    expect(getSafeStorage()).toBeNull();
  });

  it("getShell does not throw even without electron available — null fallback", () => {
    expect(() => getShell()).not.toThrow();
    expect(getShell()).toBeNull();
  });

  it("seam reset to undefined falls back to real lookup (not stale value)", () => {
    const stale = { openExternal: async () => undefined };
    __setShellForTests(stale);
    expect(getShell()).toBe(stale);
    __setShellForTests(undefined);
    // After reset, real lookup runs — returns null in this Node-only test process.
    expect(getShell()).toBeNull();
    expect(getShell()).not.toBe(stale);
  });
});
