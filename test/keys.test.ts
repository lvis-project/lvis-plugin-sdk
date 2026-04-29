/**
 * @lvis/plugin-sdk — keys.ts validation tests.
 *
 * Verifies the single-key model: MARKETPLACE_PUBLIC_KEYS exposes one trusted
 * marketplace signing public key, the map is frozen, and helpers stay in sync.
 */
import { describe, expect, it } from "vitest";
import {
  getTrustedMarketplacePublicKeys,
  MARKETPLACE_PRIMARY_KEY_ID,
  MARKETPLACE_PUBLIC_KEYS,
} from "../src/keys.js";

describe("MARKETPLACE_PUBLIC_KEYS", () => {
  it("is frozen (Object.isFrozen)", () => {
    expect(Object.isFrozen(MARKETPLACE_PUBLIC_KEYS)).toBe(true);
  });

  it("has exactly one entry (single canonical signing key)", () => {
    expect(Object.keys(MARKETPLACE_PUBLIC_KEYS).length).toBe(1);
  });

  it("all key_ids match the expected slug pattern", () => {
    for (const keyId of Object.keys(MARKETPLACE_PUBLIC_KEYS)) {
      expect(typeof keyId).toBe("string");
      expect(keyId.length).toBeGreaterThan(0);
      expect(/^[a-z0-9-]+$/.test(keyId)).toBe(true);
    }
  });

  it("all values are base64 strings of 44 characters (32-byte ed25519 key)", () => {
    for (const [keyId, value] of Object.entries(MARKETPLACE_PUBLIC_KEYS)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBe(44);
      expect(/^[A-Za-z0-9+/]+=*$/.test(value)).toBe(
        true,
        `Key "${keyId}" value is not valid base64: ${value}`,
      );
    }
  });

  it("mutation attempt throws in strict mode (frozen object)", () => {
    expect(() => {
      (MARKETPLACE_PUBLIC_KEYS as Record<string, string>)["injected-key"] = "malicious-value";
    }).toThrow();
  });

  it("deletion attempt throws in strict mode (frozen object)", () => {
    expect(() => {
      delete (MARKETPLACE_PUBLIC_KEYS as Record<string, string>)["poc-v1"];
    }).toThrow();
  });

  it("contains the 'poc-v1' key", () => {
    expect(MARKETPLACE_PUBLIC_KEYS["poc-v1"]).toBeDefined();
  });

  it("getTrustedMarketplacePublicKeys returns the same map", () => {
    expect(getTrustedMarketplacePublicKeys()).toEqual(MARKETPLACE_PUBLIC_KEYS);
  });
});

describe("MARKETPLACE_PRIMARY_KEY_ID", () => {
  it("equals 'poc-v1'", () => {
    expect(MARKETPLACE_PRIMARY_KEY_ID).toBe("poc-v1");
  });

  it("references a key that exists in MARKETPLACE_PUBLIC_KEYS", () => {
    expect(MARKETPLACE_PUBLIC_KEYS[MARKETPLACE_PRIMARY_KEY_ID]).toBeDefined();
  });
});
