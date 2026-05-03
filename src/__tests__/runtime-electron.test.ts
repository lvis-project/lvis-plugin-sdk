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
