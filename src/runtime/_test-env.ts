/**
 * @internal Shared assertion for test-only public seams under
 * `@lvis/plugin-sdk/runtime/*`.
 *
 * Allow-listed envs: vitest sets `VITEST=true`; tests run from outside
 * vitest can opt in via `LVIS_TEST=1`. The host's production builds set
 * `NODE_ENV=production`; in that case any seam call throws.
 *
 * Threat-model note: a determined compromised plugin running in the same
 * process can mutate `process.env.LVIS_TEST = "1"` before calling the
 * seam to bypass this guard. That's accepted — at the point a plugin has
 * code execution to mutate process env, it also has every other in-
 * process attack primitive available. This guard targets accidental
 * misuse (a plugin author copy-pastes a test helper into production
 * code), not a determined attacker.
 */
export function assertTestEnvironment(name: string): void {
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "production" &&
    !process.env.VITEST &&
    !process.env.LVIS_TEST
  ) {
    throw new Error(
      `${name}: test seam called in production. ` +
      `Use vitest, set LVIS_TEST=1, or remove the call.`,
    );
  }
}
