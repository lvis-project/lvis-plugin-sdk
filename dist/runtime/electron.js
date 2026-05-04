// src/runtime/electron.ts
import { createRequire } from "module";
var nodeRequire = createRequire(import.meta.url);
var electronModuleName = ["electron"].join("");
var _testSafeStorageOverride = void 0;
var _testShellOverride = void 0;
function assertTestEnvironment(name) {
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production" && !process.env.VITEST && !process.env.LVIS_TEST) {
    throw new Error(
      `${name}: test seam called in production. Use vitest, set LVIS_TEST=1, or remove the call.`
    );
  }
}
function __setSafeStorageForTests(impl) {
  assertTestEnvironment("__setSafeStorageForTests");
  _testSafeStorageOverride = impl;
}
function __setShellForTests(impl) {
  assertTestEnvironment("__setShellForTests");
  _testShellOverride = impl;
}
function getSafeStorage() {
  if (_testSafeStorageOverride !== void 0) return _testSafeStorageOverride;
  try {
    const electron = nodeRequire(electronModuleName);
    return electron.safeStorage ?? null;
  } catch {
    return null;
  }
}
function getShell() {
  if (_testShellOverride !== void 0) return _testShellOverride;
  try {
    const electron = nodeRequire(electronModuleName);
    return electron.shell ?? null;
  } catch {
    return null;
  }
}
export {
  __setSafeStorageForTests,
  __setShellForTests,
  getSafeStorage,
  getShell
};
