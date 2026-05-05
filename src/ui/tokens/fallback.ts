import { ensureFallback } from "./inject.js";

/**
 * Backward-compat shim (3.10.1+).
 *
 * The `:root` fallback CSS used to live here as a top-level
 * `injectTokenCss` side effect, and every component file added
 * `import "../tokens/fallback.js"` to ensure it ran. v3.10.1 collapsed
 * that 10-line duplication into `injectTokenCss` itself — any call to
 * `injectTokenCss` lazily ensures the `<style id="lvis-tokens-fallback">`
 * is present on first execution.
 *
 * This module is kept as a public subpath (`@lvis/plugin-sdk/ui/tokens/fallback`)
 * for plugin authors who explicitly imported it for its side effect —
 * importing this module continues to ensure the fallback `<style>` is
 * present, just via a different code path. Safe to keep, safe to drop.
 */
ensureFallback();
