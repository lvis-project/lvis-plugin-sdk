/**
 * Lazy electron runtime accessors.
 *
 * The plugin runs as an ESM bundle loaded from `~/.lvis/plugins/...`,
 * which is OUTSIDE Electron's `app.getAppPath()` — so a static
 * `import { shell } from "electron"` in the bundle resolves via Node's
 * normal ESM lookup chain, not Electron's main-process require
 * interception, and falls through to the npm `electron` package's
 * `index.js` (downloader stub) at `lvis-app/node_modules/electron/`.
 * That stub throws "Electron failed to install correctly" on first
 * import.
 *
 * Workaround: lazy `createRequire(import.meta.url)("electron")` runs
 * AFTER the bundle has loaded and goes through Node's CJS resolver
 * which Electron DOES patch. `["electron"].join("")` defeats bundler
 * static analysis so the require literal isn't substituted at build
 * time. Same pattern previously inlined in `lvis-plugin-ms-graph`
 * (`src/auth/electron-runtime.ts`) and `lvis-plugin-agent-hub`
 * (`src/auth/token-store.ts`) — extracted here so the third + nth
 * OAuth plugin doesn't re-implement the trick.
 *
 * Test seam: `vi.mock("electron", ...)` does NOT intercept
 * `createRequire("electron")` — it only hooks ESM imports, not CJS
 * require. Tests inject mocks via the `__set*ForTests` seams below.
 *
 * Override sentinel convention: `undefined` = no override (use real
 * lookup), `null` = override-to-null (electron unavailable),
 * concrete impl = override-to-mock. Production callers must treat
 * the returned `null` as "encryption / external-open unavailable" and
 * degrade gracefully.
 */

import { createRequire } from "node:module";

export interface SafeStorage {
  isEncryptionAvailable: () => boolean;
  encryptString: (s: string) => Buffer;
  decryptString: (b: Buffer) => string;
}

export interface ShellApi {
  openExternal: (url: string) => Promise<void>;
}

const nodeRequire = createRequire(import.meta.url);
const electronModuleName = ["electron"].join("");

let _testSafeStorageOverride: SafeStorage | null | undefined = undefined;
let _testShellOverride: ShellApi | null | undefined = undefined;

/** @internal Test seam — production code MUST NOT call this. */
export function __setSafeStorageForTests(
  impl: SafeStorage | null | undefined,
): void {
  _testSafeStorageOverride = impl;
}

/** @internal Test seam — production code MUST NOT call this. */
export function __setShellForTests(impl: ShellApi | null | undefined): void {
  _testShellOverride = impl;
}

export function getSafeStorage(): SafeStorage | null {
  if (_testSafeStorageOverride !== undefined) return _testSafeStorageOverride;
  try {
    const electron = nodeRequire(electronModuleName) as {
      safeStorage?: SafeStorage;
    };
    return electron.safeStorage ?? null;
  } catch {
    return null;
  }
}

// Returns `null` when electron cannot be resolved (e.g. test environment
// without seam, or a broken install). Callers should surface a domain
// error rather than letting an unhandled throw bubble up.
export function getShell(): ShellApi | null {
  if (_testShellOverride !== undefined) return _testShellOverride;
  try {
    const electron = nodeRequire(electronModuleName) as {
      shell?: ShellApi;
    };
    return electron.shell ?? null;
  } catch {
    return null;
  }
}
