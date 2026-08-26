/**
 * Shared test fixture projector: flat manifest -> Agent Plugins 1.0.0 document.
 *
 * Not exported from the SDK surface. The forward projection (document -> flat)
 * is host-owned and mirrored into `src/index.ts`; this inverse exists only so
 * schema fixtures can stay readable, and it has no production consumer to
 * justify putting it in the contract. It lives here rather than in either test
 * file because both of them need it, and two copies of a field split are two
 * chances to disagree about where a field belongs.
 */
import { AGENT_PLUGINS_SCHEMA_URL, LVIS_EXTENSION_NAMESPACE } from "../index.js";

/**
 * Project a flat fixture into the Agent Plugins 1.0.0 document the schema
 * describes — the inverse of the mirrored `flattenAgentPluginsManifest`.
 *
 * Fixtures below stay flat because that is what each case is about (a tool
 * shape, an auth block, a capability string); nesting every one of them would
 * bury the subject in envelope. Only the bytes handed to AJV are nested.
 *
 * Faithful about absence: a fixture that omits `id` produces a document with no
 * `name`, which is how the negative cases drive the missing-identity path.
 */
export function agentPluginsDocument(manifest: unknown): unknown {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return manifest;
  }
  const { id, name, ...rest } = manifest as Record<string, unknown>;
  const portable = new Set([
    "version", "description", "author", "homepage", "repository", "license", "keywords",
  ]);
  const top: Record<string, unknown> = { $schema: AGENT_PLUGINS_SCHEMA_URL };
  if (id !== undefined) top.name = id;
  const lvis: Record<string, unknown> = {};
  if (name !== undefined) lvis.displayName = name;
  for (const [key, value] of Object.entries(rest)) {
    if (portable.has(key)) top[key] = value;
    else lvis[key] = value;
  }
  top.extensions = { [LVIS_EXTENSION_NAMESPACE]: lvis };
  return top;
}

