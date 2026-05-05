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
export interface SafeStorage {
    isEncryptionAvailable: () => boolean;
    encryptString: (s: string) => Buffer;
    decryptString: (b: Buffer) => string;
}
export interface ShellApi {
    openExternal: (url: string) => Promise<void>;
}
/** @internal Test seam — production code MUST NOT call this. */
export declare function __setSafeStorageForTests(impl: SafeStorage | null | undefined): void;
/** @internal Test seam — production code MUST NOT call this. */
export declare function __setShellForTests(impl: ShellApi | null | undefined): void;
export declare function getSafeStorage(): SafeStorage | null;
export declare function getShell(): ShellApi | null;
//# sourceMappingURL=electron.d.ts.map