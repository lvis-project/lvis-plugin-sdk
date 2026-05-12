import { applyThemeFromHostEvent } from "../tokens/inject.js";
import { type LvisHostThemeEvent } from "../tokens/index.js";

/**
 * Bridge surface required by `primeTheme` / `useTheme`.
 *
 * Both methods are provided by `window.lvisPlugin` (`plugin-preload.ts`):
 * - `onEvent("host.theme.changed", …)` — subscribe; preload's sticky cache
 *   replays the last payload synchronously to late subscribers.
 * - `getTheme()` — sync IPC pull of the last validated theme payload.
 *   Optional in the type so vanilla mock bridges and SDK ≤ v5.2 consumers
 *   that don't expose it still compile.
 */
export interface PluginBridgeForTheme {
  onEvent: (type: string, handler: (data: unknown) => void) => () => void;
  getTheme?: () => Promise<LvisHostThemeEvent | null>;
}

export interface PrimeThemeOptions {
  /**
   * Document or element to apply tokens to.
   *
   * - `undefined` → `document.documentElement` (default)
   * - `Document` → `target.documentElement` (use this for detached
   *   `BrowserWindow` documents that aren't the global `document`)
   * - `HTMLElement` → that element directly (use this for scoped
   *   sub-tree mounts that don't own documentElement)
   */
  target?: Document | HTMLElement;
  /**
   * Called every time a validated `host.theme.changed` payload arrives,
   * AFTER the SDK has applied its own attributes/tokens. Use for custom
   * token derivations (e.g. plugin-side sidebar mirroring, accent
   * remapping). Errors thrown by the callback are caught and logged so
   * a buggy callback doesn't break the theme path.
   */
  onPayload?: (event: LvisHostThemeEvent) => void;
}

export interface PrimeThemeHandle {
  /** Unsubscribe from `host.theme.changed`. Call on plugin unmount. */
  dispose: () => void;
}

function applyPayload(payload: unknown, opts: PrimeThemeOptions): void {
  if (!payload || typeof payload !== "object") return;
  const event = payload as LvisHostThemeEvent;
  applyThemeFromHostEvent(event, opts.target);
  if (opts.onPayload && event.bundleId && event.shell && event.tokens) {
    try {
      opts.onPayload(event);
    } catch (err) {
      console.warn("[lvis:primeTheme] onPayload callback threw", err);
    }
  }
}

/**
 * Subscribe to host theme changes AND prime the initial state.
 *
 * Canonical entry for plugins (React + vanilla) to wire host theme
 * synchronization in their mount entry. Encapsulates 3 paths that
 * previously had to be hand-coded per-plugin:
 *
 *   1. Pull-on-load via `bridge.getTheme()` — covers cold boot when no
 *      broadcast has happened yet (race-free request/response).
 *   2. Subscribe via `bridge.onEvent("host.theme.changed", …)` — handles
 *      every subsequent toggle (user changes theme bundle / shell).
 *   3. Apply payload (validated `bundleId` / `shell` / `tokens`) to
 *      `target` via {@link applyThemeFromHostEvent}.
 *
 * **Mount contract**: this should be the first await-able call in every
 * plugin's `mount()` — see `docs/references/plugin-tool-schema-design.md`
 * §2.6 (rule 4).
 *
 * @returns `{ dispose }` — call on unmount to unsubscribe.
 *
 * @example Vanilla plugin (incl. detached BrowserWindow / scoped root)
 * ```ts
 * export function mount(host: PluginHost): PluginInstance {
 *   const handle = primeTheme(host.bridge, {
 *     target: host.targetDocument ?? document,
 *   });
 *   // … plugin DOM build …
 *   return { unmount: () => handle.dispose() };
 * }
 * ```
 *
 * @example React plugin — prefer the {@link useTheme} hook which wraps this
 */
export function primeTheme(
  bridge: PluginBridgeForTheme,
  opts: PrimeThemeOptions = {},
): PrimeThemeHandle {
  // Subscribe first — preload's sticky cache replays the last
  // host.theme.changed payload synchronously when present, so we capture
  // any already-broadcast theme in the same tick.
  const unsub = bridge.onEvent("host.theme.changed", (data) => {
    applyPayload(data, opts);
  });

  // Then explicitly pull to cover cold-boot windows where no broadcast
  // has fired yet and the sticky cache is empty. The IPC is request/
  // response — race-free against any subsequent broadcast.
  if (typeof bridge.getTheme === "function") {
    Promise.resolve(bridge.getTheme())
      .then((payload) => {
        if (payload) applyPayload(payload, opts);
      })
      .catch((err) => {
        console.warn("[lvis:primeTheme] getTheme() pull failed", err);
      });
  }

  return { dispose: unsub };
}
