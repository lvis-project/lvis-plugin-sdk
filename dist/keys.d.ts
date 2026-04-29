/**
 * Trusted marketplace signing public keys, keyed by `key_id`.
 * Values are base64-encoded raw 32-byte ed25519 public keys.
 */
export declare const MARKETPLACE_PUBLIC_KEYS: Readonly<Record<string, string>>;
/**
 * Returns the trusted public-key map for client-side signature verification.
 *
 * The single-key model intentionally drops the legacy dev-v1/dual-sign path —
 * pre-prod still uses POC keys, prod rotation is handled by shipping a new
 * SDK major (additive add, then remove the old key in a later major).
 */
export declare function getTrustedMarketplacePublicKeys(options?: {
    includeTestKeys?: boolean;
}): Readonly<Record<string, string>>;
/**
 * Canonical key_id of the current marketplace signing key. The marketplace
 * server refuses to boot when `LVIS_ENV=production` is set with this key —
 * the prod rotation will replace this constant in a future major SDK.
 */
export declare const MARKETPLACE_PRIMARY_KEY_ID: "poc-v1";
//# sourceMappingURL=keys.d.ts.map