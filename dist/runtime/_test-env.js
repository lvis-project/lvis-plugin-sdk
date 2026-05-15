// src/runtime/_test-env.ts
function assertTestEnvironment(name) {
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production" && !process.env.VITEST && !process.env.LVIS_TEST) {
    throw new Error(
      `${name}: test seam called in production. Use vitest, set LVIS_TEST=1, or remove the call.`
    );
  }
}
export {
  assertTestEnvironment
};
