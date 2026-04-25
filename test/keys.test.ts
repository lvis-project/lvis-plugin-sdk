/**
 * @lvis/plugin-sdk — keys.ts validation tests (sdk#6 follow-up)
 *
 * Verifies:
 *  - MARKETPLACE_PUBLIC_KEYS is a frozen object (Object.isFrozen)
 *  - Keys are non-empty strings matching expected key_id format
 *  - Values are valid base64 strings of the correct length (32 bytes = 44 base64 chars)
 *  - MARKETPLACE_PRIMARY_KEY_ID is a key present in MARKETPLACE_PUBLIC_KEYS
 *  - The object cannot be mutated at runtime
 */
import { describe, expect, it } from "vitest";
import {
  getTrustedMarketplacePublicKeys,
  MARKETPLACE_PRIMARY_KEY_ID,
  MARKETPLACE_PUBLIC_KEYS,
  MARKETPLACE_TEST_KEY_IDS,
} from "../src/keys.js";

describe("MARKETPLACE_PUBLIC_KEYS", () => {
  it("is frozen (Object.isFrozen)", () => {
    expect(Object.isFrozen(MARKETPLACE_PUBLIC_KEYS)).toBe(true);
  });

  it("has at least one entry", () => {
    expect(Object.keys(MARKETPLACE_PUBLIC_KEYS).length).toBeGreaterThan(0);
  });

  it("all key_ids are non-empty strings matching [a-z0-9-]+ pattern", () => {
    for (const keyId of Object.keys(MARKETPLACE_PUBLIC_KEYS)) {
      expect(typeof keyId).toBe("string");
      expect(keyId.length).toBeGreaterThan(0);
      expect(/^[a-z0-9-]+$/.test(keyId)).toBe(true);
    }
  });

  it("all values are base64 strings of 44 characters (32-byte ed25519 key)", () => {
    for (const [keyId, value] of Object.entries(MARKETPLACE_PUBLIC_KEYS)) {
      expect(typeof value).toBe("string");
      // Base64-encoded 32 bytes = 44 characters (with padding)
      expect(value.length).toBe(44);
      // Valid base64 characters
      expect(/^[A-Za-z0-9+/]+=*$/.test(value)).toBe(
        true,
        `Key "${keyId}" value is not valid base64: ${value}`,
      );
    }
  });

  it("mutation attempt throws in strict mode (frozen object)", () => {
    expect(() => {
      // TypeScript won't allow direct assignment but we test runtime behavior
      (MARKETPLACE_PUBLIC_KEYS as Record<string, string>)["injected-key"] = "malicious-value";
    }).toThrow();
  });

  it("deletion attempt throws in strict mode (frozen object)", () => {
    expect(() => {
      delete (MARKETPLACE_PUBLIC_KEYS as Record<string, string>)["dev-v1"];
    }).toThrow();
  });

  it("contains the 'dev-v1' key", () => {
    expect(MARKETPLACE_PUBLIC_KEYS["dev-v1"]).toBeDefined();
  });

  it("contains the 'poc-v1' key", () => {
    expect(MARKETPLACE_PUBLIC_KEYS["poc-v1"]).toBeDefined();
  });

  it("marks dev and poc keys as test-only", () => {
    expect(MARKETPLACE_TEST_KEY_IDS).toEqual(["dev-v1", "poc-v1"]);
  });

  it("excludes test keys from the trusted runtime set by default", () => {
    const trusted = getTrustedMarketplacePublicKeys();
    expect(trusted["dev-v1"]).toBeUndefined();
    expect(trusted["poc-v1"]).toBeUndefined();
  });

  it("includes test keys only when explicitly requested", () => {
    const trusted = getTrustedMarketplacePublicKeys({ includeTestKeys: true });
    expect(trusted["dev-v1"]).toBeDefined();
    expect(trusted["poc-v1"]).toBeDefined();
  });
});

describe("MARKETPLACE_PRIMARY_KEY_ID", () => {
  it("is a non-empty string", () => {
    expect(typeof MARKETPLACE_PRIMARY_KEY_ID).toBe("string");
    expect(MARKETPLACE_PRIMARY_KEY_ID.length).toBeGreaterThan(0);
  });

  it("references a key that exists in MARKETPLACE_PUBLIC_KEYS", () => {
    expect(MARKETPLACE_PUBLIC_KEYS[MARKETPLACE_PRIMARY_KEY_ID]).toBeDefined();
  });

  it("equals 'poc-v1' (current POC signing key)", () => {
    expect(MARKETPLACE_PRIMARY_KEY_ID).toBe("poc-v1");
  });
});
