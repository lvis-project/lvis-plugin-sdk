import type { InstallPolicy } from "./index.js";
/** `$id` of the skill package schema; also the `$schema` a skill manifest carries. */
export declare const SKILL_PACKAGE_SCHEMA_URL = "https://sdk.lvisai.xyz/schemas/skill.schema.json";
/** `$id` of the agent package schema; also the `$schema` an agent manifest carries. */
export declare const AGENT_PACKAGE_SCHEMA_URL = "https://sdk.lvisai.xyz/schemas/agent.schema.json";
/** JSON pointer of the skill component definition inside the skill package schema. */
export declare const SKILL_COMPONENT_POINTER = "#/$defs/skillComponent";
/** JSON pointer of the agent component definition inside the agent package schema. */
export declare const AGENT_COMPONENT_POINTER = "#/$defs/agentComponent";
/** Absolute `$ref` that resolves to the skill component definition. */
export declare const SKILL_COMPONENT_REF = "https://sdk.lvisai.xyz/schemas/skill.schema.json#/$defs/skillComponent";
/** Absolute `$ref` that resolves to the agent component definition. */
export declare const AGENT_COMPONENT_REF = "https://sdk.lvisai.xyz/schemas/agent.schema.json#/$defs/agentComponent";
/** Schema file names, relative to the SDK package root. */
export declare const SKILL_PACKAGE_SCHEMA_FILE = "schemas/skill-package.schema.json";
export declare const AGENT_PACKAGE_SCHEMA_FILE = "schemas/agent-package.schema.json";
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
    /** Arbitrary key-value map; the Agent Skills specification assigns no shape to the values. @optional */
    metadata?: Record<string, unknown>;
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
export interface SkillPackageManifest extends PackageManifestEnvelope, Pick<SkillComponent, "triggers"> {
}
/** `plugin.json` of a standalone agent package. */
export interface AgentPackageManifest extends PackageManifestEnvelope, Pick<AgentComponent, "model" | "mode" | "tools" | "triggers"> {
}
/** One schema violation, addressed by JSON pointer into the validated document. */
export interface PackageValidationIssue {
    /** Instance path of the offending value (`""` for the document root). */
    path: string;
    message: string;
}
export type PackageValidationResult<T> = {
    valid: true;
    value: T;
} | {
    valid: false;
    issues: PackageValidationIssue[];
};
/** The optional peer the validators need; the schema files and types do not. */
export declare const PACKAGE_VALIDATOR_PEER = "ajv";
/**
 * Thrown by a validator call when the optional `ajv` peer is not installed.
 * Importing this module never needs it: the constants, types and schema file
 * paths are usable without it, and only a validator call resolves it.
 */
export declare class PackageValidatorDependencyError extends Error {
    constructor(cause: unknown);
}
/** Validate a standalone skill package `plugin.json`. */
export declare function validateSkillPackageManifest(document: unknown): PackageValidationResult<SkillPackageManifest>;
/** Validate a standalone agent package `plugin.json`. */
export declare function validateAgentPackageManifest(document: unknown): PackageValidationResult<AgentPackageManifest>;
/** Validate parsed `SKILL.md` front matter — standalone or bundled, same definition. */
export declare function validateSkillComponent(frontMatter: unknown): PackageValidationResult<SkillComponent>;
/** Validate parsed `AGENTS.md` front matter — standalone or bundled, same definition. */
export declare function validateAgentComponent(frontMatter: unknown): PackageValidationResult<AgentComponent>;
export {};
//# sourceMappingURL=packages.d.ts.map