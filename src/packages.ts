/**
 * Authoring contract for marketplace-distributed skill and agent packages.
 *
 * This is an SDK-local surface, like `./build`: the LVIS host never loads a
 * standalone package manifest, so nothing here mirrors `../index.js`. The two
 * JSON Schemas under `schemas/` are the single home of the contract; the
 * marketplace validates uploads against byte-identical snapshots of them, and
 * the types and validators below are read straight off those files so a
 * consumer that pins one SDK tag gets one answer from every path.
 *
 * A package is a directory: `plugin.json` (the manifest) beside the component
 * file (`SKILL.md` or `AGENTS.md`). The manifest is the marketplace envelope;
 * the component's front matter is the part the host actually loads. The
 * schema describes the component once, in `$defs`, and the manifest reuses
 * those field definitions by `$ref` — which is what keeps a skill shipped
 * standalone and a skill bundled through a plugin's `skills[]` declaration on
 * one definition.
 */
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import type { InstallPolicy } from "./index.js";

/** `$id` of the skill package schema; also the `$schema` a skill manifest carries. */
export const SKILL_PACKAGE_SCHEMA_URL =
  "https://sdk.lvisai.xyz/schemas/skill.schema.json";

/** `$id` of the agent package schema; also the `$schema` an agent manifest carries. */
export const AGENT_PACKAGE_SCHEMA_URL =
  "https://sdk.lvisai.xyz/schemas/agent.schema.json";

/** JSON pointer of the skill component definition inside the skill package schema. */
export const SKILL_COMPONENT_POINTER = "#/$defs/skillComponent";

/** JSON pointer of the agent component definition inside the agent package schema. */
export const AGENT_COMPONENT_POINTER = "#/$defs/agentComponent";

/** Absolute `$ref` that resolves to the skill component definition. */
export const SKILL_COMPONENT_REF = `${SKILL_PACKAGE_SCHEMA_URL}${SKILL_COMPONENT_POINTER}`;

/** Absolute `$ref` that resolves to the agent component definition. */
export const AGENT_COMPONENT_REF = `${AGENT_PACKAGE_SCHEMA_URL}${AGENT_COMPONENT_POINTER}`;

/** Schema file names, relative to the SDK package root. */
export const SKILL_PACKAGE_SCHEMA_FILE = "schemas/skill-package.schema.json";
export const AGENT_PACKAGE_SCHEMA_FILE = "schemas/agent-package.schema.json";

/**
 * Front matter of a `SKILL.md` — the Agent Skills fields plus LVIS `triggers`.
 * Governs both the root of a standalone skill package and every directory a
 * plugin manifest declares under `skills[]`.
 */
export interface SkillComponent {
  /** Slug; equals the directory name and, standalone, the marketplace slug. */
  name: string;
  /** What the skill does and when to use it (max 280 characters). */
  description: string;
  /** Keyword trigger hints. @optional */
  triggers?: string[];
  /** License name or a reference to a bundled license file. @optional */
  license?: string;
  /** Environment requirements (max 500 characters). @optional */
  compatibility?: string;
  /** Arbitrary string-valued metadata. @optional */
  metadata?: Record<string, string>;
  /** Space-delimited tools the skill is pre-approved to use. @optional */
  "allowed-tools"?: string;
}

/**
 * Front matter of an `AGENTS.md` — the agent profile the LVIS host loads.
 * Governs both the root of a standalone agent package and a profile bundled
 * as a plugin component.
 */
export interface AgentComponent {
  /** Slug; equals the directory name and, standalone, the marketplace slug. */
  name: string;
  /** What the agent does and when to hand work to it (max 280 characters). */
  description: string;
  /** Preferred model hint. @optional */
  model?: string;
  /** Execution/profile mode hint. @optional */
  mode?: string;
  /** Tool hints surfaced with the profile. @optional */
  tools?: string[];
  /** Keyword trigger hints. @optional */
  triggers?: string[];
}

/** Marketplace envelope fields every standalone package manifest carries. */
interface PackageManifestEnvelope {
  /** Classification URI; pinned to the schema `$id`. @optional */
  $schema?: string;
  /** Marketplace slug and install directory name; equals the component `name`. */
  id: string;
  /** Human-readable display name shown in the catalog. */
  name: string;
  /** Stable MAJOR.MINOR.PATCH. */
  version: string;
  /** Same field as the component `description`. */
  description: string;
  /** @optional */
  installPolicy?: InstallPolicy;
  /** Package author name or email. @optional */
  author?: string;
  /** Catalog capability tags. @optional */
  capabilities?: string[];
}

/** `plugin.json` of a standalone skill package. */
export interface SkillPackageManifest
  extends PackageManifestEnvelope, Pick<SkillComponent, "triggers"> {}

/** `plugin.json` of a standalone agent package. */
export interface AgentPackageManifest
  extends PackageManifestEnvelope,
    Pick<AgentComponent, "model" | "mode" | "tools" | "triggers"> {}

/** One schema violation, addressed by JSON pointer into the validated document. */
export interface PackageValidationIssue {
  /** Instance path of the offending value (`""` for the document root). */
  path: string;
  message: string;
}

export type PackageValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; issues: PackageValidationIssue[] };

/**
 * Both schemas are registered on one AJV instance so an absolute component
 * `$ref` resolves without a network round trip. Compiled lazily: the file
 * read and the compile happen on first use, not at import time.
 */
let registry: Ajv2020 | undefined;

function schemaRegistry(): Ajv2020 {
  if (registry === undefined) {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    for (const file of [SKILL_PACKAGE_SCHEMA_FILE, AGENT_PACKAGE_SCHEMA_FILE]) {
      const url = new URL(`../${file}`, import.meta.url);
      ajv.addSchema(JSON.parse(readFileSync(url, "utf8")) as object);
    }
    registry = ajv;
  }
  return registry;
}

const compiled = new Map<string, ValidateFunction>();

function validator(ref: string): ValidateFunction {
  let fn = compiled.get(ref);
  if (fn === undefined) {
    const ajv = schemaRegistry();
    fn = ref.includes("#") ? ajv.compile({ $ref: ref }) : ajv.getSchema(ref)!;
    compiled.set(ref, fn);
  }
  return fn;
}

function report<T>(fn: ValidateFunction, document: unknown): PackageValidationResult<T> {
  if (fn(document)) return { valid: true, value: document as T };
  const issues = (fn.errors ?? []).map((error: ErrorObject) => ({
    path: error.instancePath,
    message: error.message ?? error.keyword,
  }));
  return { valid: false, issues };
}

/** Validate a standalone skill package `plugin.json`. */
export function validateSkillPackageManifest(
  document: unknown,
): PackageValidationResult<SkillPackageManifest> {
  return report(validator(SKILL_PACKAGE_SCHEMA_URL), document);
}

/** Validate a standalone agent package `plugin.json`. */
export function validateAgentPackageManifest(
  document: unknown,
): PackageValidationResult<AgentPackageManifest> {
  return report(validator(AGENT_PACKAGE_SCHEMA_URL), document);
}

/** Validate parsed `SKILL.md` front matter — standalone or bundled, same definition. */
export function validateSkillComponent(
  frontMatter: unknown,
): PackageValidationResult<SkillComponent> {
  return report(validator(SKILL_COMPONENT_REF), frontMatter);
}

/** Validate parsed `AGENTS.md` front matter — standalone or bundled, same definition. */
export function validateAgentComponent(
  frontMatter: unknown,
): PackageValidationResult<AgentComponent> {
  return report(validator(AGENT_COMPONENT_REF), frontMatter);
}
