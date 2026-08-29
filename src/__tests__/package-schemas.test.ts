/**
 * Skill / agent package schemas — the SDK-owned authoring contract.
 *
 * Unlike `plugin-manifest.schema.json`, these two files are not mirrors: the
 * host never loads a standalone package, so the SDK is their single home and
 * the marketplace validates against byte-identical snapshots. What this suite
 * pins down, therefore, is the contract itself: the files compile under AJV
 * strict mode in the dialect they declare, a sample standalone package of
 * each kind validates, the component front matter validates against the
 * `$defs` entry on its own, and the package manifest reaches that component
 * only through `$ref` — never through an inline copy that could drift.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import Ajv2020 from "ajv/dist/2020.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { ValidateFunction } from "ajv";
import { LVIS_EXTENSION_NAMESPACE } from "../index.js";
import {
  AGENT_COMPONENT_POINTER,
  AGENT_COMPONENT_REF,
  AGENT_PACKAGE_SCHEMA_FILE,
  AGENT_PACKAGE_SCHEMA_URL,
  SKILL_COMPONENT_POINTER,
  SKILL_COMPONENT_REF,
  SKILL_PACKAGE_SCHEMA_FILE,
  SKILL_PACKAGE_SCHEMA_URL,
  validateAgentComponent,
  validateAgentPackageManifest,
  validateSkillComponent,
  validateSkillPackageManifest,
  type AgentPackageManifest,
  type SkillPackageManifest,
} from "../packages.js";
import { agentPluginsDocument } from "./agent-plugins-document.js";

const require = createRequire(import.meta.url);

type Schema = Record<string, unknown> & {
  $id: string;
  properties: Record<string, Record<string, unknown>>;
  $defs: Record<string, { properties: Record<string, unknown>; required: string[] }>;
};

function loadSchema(file: string): Schema {
  return JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")) as Schema;
}

const skillSchema = loadSchema(SKILL_PACKAGE_SCHEMA_FILE);
const agentSchema = loadSchema(AGENT_PACKAGE_SCHEMA_FILE);

function strictRegistry(): Ajv2020 {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  ajv.addSchema(skillSchema);
  ajv.addSchema(agentSchema);
  return ajv;
}

const SKILL_PACKAGE: SkillPackageManifest = {
  $schema: SKILL_PACKAGE_SCHEMA_URL,
  id: "angular-architect",
  name: "Angular Architect",
  version: "1.1.0",
  description: "Generates Angular standalone components and configures routing.",
  installPolicy: "user",
  author: "Example Author",
  triggers: ["angular", "architect"],
  capabilities: ["skill-profile"],
};

const AGENT_PACKAGE: AgentPackageManifest = {
  $schema: AGENT_PACKAGE_SCHEMA_URL,
  id: "engineering-code-reviewer",
  name: "Code Reviewer",
  version: "0.1.0",
  description: "Expert code reviewer focused on correctness and maintainability.",
  installPolicy: "user",
  author: "Example Author",
  mode: "subagent",
  tools: ["skill_list", "skill_load"],
  triggers: ["engineering", "code", "reviewer"],
  capabilities: ["agent-profile", "engineering"],
};

/** Front matter of the SKILL.md that ships beside SKILL_PACKAGE. */
const SKILL_FRONT_MATTER = {
  name: SKILL_PACKAGE.id,
  description: SKILL_PACKAGE.description,
  triggers: SKILL_PACKAGE.triggers,
};

/** Front matter of the AGENTS.md that ships beside AGENT_PACKAGE. */
const AGENT_FRONT_MATTER = {
  name: AGENT_PACKAGE.id,
  description: AGENT_PACKAGE.description,
  tools: AGENT_PACKAGE.tools,
  triggers: AGENT_PACKAGE.triggers,
  mode: AGENT_PACKAGE.mode,
};

describe("package schemas — identity and dialect", () => {
  it("declare the 2020-12 dialect and compile under AJV strict mode", () => {
    for (const schema of [skillSchema, agentSchema]) {
      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    }
    expect(() => strictRegistry()).not.toThrow();
  });

  it("pin `$schema` to their own `$id`, which the SDK exports as the package URL", () => {
    expect(skillSchema.$id).toBe(SKILL_PACKAGE_SCHEMA_URL);
    expect(agentSchema.$id).toBe(AGENT_PACKAGE_SCHEMA_URL);
    expect(skillSchema.properties.$schema.const).toBe(skillSchema.$id);
    expect(agentSchema.properties.$schema.const).toBe(agentSchema.$id);
  });

  it("share the `$id` host with the mirrored plugin manifest schema", () => {
    const manifest = require("../../schemas/plugin-manifest.schema.json") as { $id: string };
    const host = new URL(manifest.$id).host;
    expect(new URL(skillSchema.$id).host).toBe(host);
    expect(new URL(agentSchema.$id).host).toBe(host);
  });

  it("guard every regex-constrained string against terminal CR/LF", () => {
    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) {
        node.forEach((item, index) => walk(item, `${path}/${index}`));
        return;
      }
      if (!node || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      if (typeof record.pattern === "string") {
        expect(record.not, `${path} has a pattern without a CR/LF guard`).toEqual({
          pattern: "[\\r\\n]",
        });
      }
      for (const [key, value] of Object.entries(record)) {
        if (key !== "not") walk(value, `${path}/${key}`);
      }
    };
    walk(skillSchema, "skill");
    walk(agentSchema, "agent");
  });
});

describe("package schemas — `$ref` reuse of the component definition", () => {
  const refsInto = (
    schema: Schema,
    pointer: string,
    shared: string[],
  ): void => {
    const component = pointer.replace("#/$defs/", "");
    for (const field of shared) {
      const property = schema.properties[field];
      // The manifest field IS the component field: nothing inline to drift.
      expect(Object.keys(property), `${component}.${field}`).toEqual(["$ref"]);
      const target = field === "id" ? "name" : field;
      expect(property.$ref).toBe(`${pointer}/properties/${target}`);
      expect(schema.$defs[component].properties[target]).toBeDefined();
    }
  };

  it("skill manifest fields id/description/triggers are `$ref`s into $defs/skillComponent", () => {
    refsInto(skillSchema, SKILL_COMPONENT_POINTER, ["id", "description", "triggers"]);
  });

  it("agent manifest fields id/description/model/mode/tools/triggers are `$ref`s into $defs/agentComponent", () => {
    refsInto(agentSchema, AGENT_COMPONENT_POINTER, [
      "id", "description", "model", "mode", "tools", "triggers",
    ]);
  });

  it("the component definitions name the same fields the front matter files carry", () => {
    expect(Object.keys(skillSchema.$defs.skillComponent.properties)).toEqual([
      "name", "description", "triggers", "license", "compatibility", "metadata", "allowed-tools",
    ]);
    expect(skillSchema.$defs.skillComponent.required).toEqual(["name", "description"]);
    expect(Object.keys(agentSchema.$defs.agentComponent.properties)).toEqual([
      "name", "description", "model", "mode", "tools", "triggers",
    ]);
    expect(agentSchema.$defs.agentComponent.required).toEqual(["name", "description"]);
  });

  it("the exported absolute component refs resolve on a registry holding both schemas", () => {
    const ajv = strictRegistry();
    expect(SKILL_COMPONENT_REF).toBe(`${SKILL_PACKAGE_SCHEMA_URL}${SKILL_COMPONENT_POINTER}`);
    expect(AGENT_COMPONENT_REF).toBe(`${AGENT_PACKAGE_SCHEMA_URL}${AGENT_COMPONENT_POINTER}`);
    expect(ajv.compile({ $ref: SKILL_COMPONENT_REF })(SKILL_FRONT_MATTER)).toBe(true);
    expect(ajv.compile({ $ref: AGENT_COMPONENT_REF })(AGENT_FRONT_MATTER)).toBe(true);
  });
});

describe("package schemas — standalone packages", () => {
  it("accept a sample standalone skill package and its SKILL.md front matter", () => {
    expect(validateSkillPackageManifest(SKILL_PACKAGE)).toEqual({ valid: true, value: SKILL_PACKAGE });
    expect(validateSkillComponent(SKILL_FRONT_MATTER)).toEqual({
      valid: true,
      value: SKILL_FRONT_MATTER,
    });
  });

  it("accept a sample standalone agent package and its AGENTS.md front matter", () => {
    expect(validateAgentPackageManifest(AGENT_PACKAGE)).toEqual({ valid: true, value: AGENT_PACKAGE });
    expect(validateAgentComponent(AGENT_FRONT_MATTER)).toEqual({
      valid: true,
      value: AGENT_FRONT_MATTER,
    });
  });

  it("accept the Agent Skills optional front matter fields on a skill component", () => {
    const result = validateSkillComponent({
      ...SKILL_FRONT_MATTER,
      license: "MIT",
      compatibility: "Requires network access to the Angular CLI registry.",
      metadata: { author: "example", version: "1.1.0" },
      "allowed-tools": "Bash(git:*) Read",
    });
    expect(result.valid).toBe(true);
  });

  it("accept a manifest that omits `$schema` (classification is the marketplace's job)", () => {
    const { $schema: _omitted, ...bare } = SKILL_PACKAGE;
    expect(validateSkillPackageManifest(bare).valid).toBe(true);
  });

  it("report issues by instance path", () => {
    const result = validateSkillPackageManifest({ ...SKILL_PACKAGE, version: "1.1" });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.issues.map((issue) => issue.path)).toContain("/version");
  });

  describe("rejects", () => {
    const skillCases: Array<[string, Record<string, unknown>]> = [
      ["a foreign `$schema`", { $schema: AGENT_PACKAGE_SCHEMA_URL }],
      ["an id with an upper-case letter", { id: "Angular-Architect" }],
      ["an id shorter than three characters", { id: "ab" }],
      ["an id ending in a hyphen", { id: "angular-" }],
      ["an id carrying a terminal newline", { id: "angular-architect\n" }],
      ["a pre-release version", { version: "1.1.0-beta.1" }],
      ["a version carrying a terminal CR", { version: "1.1.0\r" }],
      ["an empty description", { description: "" }],
      ["a description over 280 characters", { description: "x".repeat(281) }],
      ["an unknown installPolicy", { installPolicy: "everyone" }],
      ["a non-string trigger", { triggers: ["angular", 7] }],
      ["a capability with an upper-case letter", { capabilities: ["Skill-Profile"] }],
      ["an undeclared property", { entry: "dist/index.js" }],
      ["agent-only profile fields", { mode: "subagent" }],
    ];
    for (const [label, override] of skillCases) {
      it(`a skill package with ${label}`, () => {
        expect(validateSkillPackageManifest({ ...SKILL_PACKAGE, ...override }).valid).toBe(false);
      });
    }

    const agentCases: Array<[string, Record<string, unknown>]> = [
      ["a foreign `$schema`", { $schema: SKILL_PACKAGE_SCHEMA_URL }],
      ["a non-array tools value", { tools: "skill_list" }],
      ["a non-string model", { model: 3 }],
      ["an undeclared property", { entry: "dist/index.js" }],
    ];
    for (const [label, override] of agentCases) {
      it(`an agent package with ${label}`, () => {
        expect(validateAgentPackageManifest({ ...AGENT_PACKAGE, ...override }).valid).toBe(false);
      });
    }

    for (const field of ["id", "name", "version", "description"] as const) {
      it(`a package manifest missing required \`${field}\``, () => {
        const { [field]: _dropped, ...rest } = SKILL_PACKAGE;
        expect(validateSkillPackageManifest(rest).valid).toBe(false);
      });
    }

    it("front matter with an undeclared field or a missing description", () => {
      expect(validateSkillComponent({ ...SKILL_FRONT_MATTER, entry: "x" }).valid).toBe(false);
      expect(validateSkillComponent({ name: "angular-architect" }).valid).toBe(false);
      expect(validateAgentComponent({ ...AGENT_FRONT_MATTER, entry: "x" }).valid).toBe(false);
      expect(validateAgentComponent({ name: "engineering-code-reviewer" }).valid).toBe(false);
    });

    it("front matter whose name is not a slug", () => {
      expect(validateSkillComponent({ ...SKILL_FRONT_MATTER, name: "Angular Architect" }).valid).toBe(false);
      expect(validateAgentComponent({ ...AGENT_FRONT_MATTER, name: "Code Reviewer" }).valid).toBe(false);
    });
  });
});

describe("package schemas — the bundled path uses the same component definition", () => {
  /** The host's own AJV options, as `manifest-schema.test.ts` documents them. */
  function pluginManifestValidator(): ValidateFunction {
    const ajv = new Ajv({
      strict: true,
      strictRequired: false,
      allErrors: true,
      allowUnionTypes: true,
    });
    addFormats(ajv);
    return ajv.compile(require("../../schemas/plugin-manifest.schema.json"));
  }

  it("a plugin that bundles the skill declares it under skills[] and ships the same SKILL.md front matter", () => {
    // Agent Plugins 1.0.0 side: the plugin manifest declares the skill by
    // directory. The host schema's `skills[]` item is a {id, path}
    // declaration — the component itself lives in the directory's SKILL.md.
    const plugin = agentPluginsDocument({
      id: "frontend-toolkit",
      name: "Frontend Toolkit",
      version: "2.0.0",
      entry: "dist/index.js",
      description: "Bundles the Angular Architect skill with a build tool.",
      tools: [],
      skills: [{ id: "angular_architect", path: `skills/${SKILL_PACKAGE.id}` }],
    }) as { extensions: Record<string, { skills: Array<{ path: string }> }> };
    const validatePlugin = pluginManifestValidator();
    expect(validatePlugin(plugin), JSON.stringify(validatePlugin.errors)).toBe(true);

    // The declared directory's SKILL.md front matter — validated with the
    // SAME definition the standalone package reaches through `$ref`.
    const declared = plugin.extensions[LVIS_EXTENSION_NAMESPACE].skills[0];
    expect(declared.path.endsWith(`/${SKILL_FRONT_MATTER.name}`)).toBe(true);
    expect(validateSkillComponent(SKILL_FRONT_MATTER).valid).toBe(true);

    // And the standalone package that ships the identical front matter.
    expect(validateSkillPackageManifest(SKILL_PACKAGE).valid).toBe(true);
  });

  it("a front matter change that breaks the bundled component breaks the standalone package the same way", () => {
    const overlong = "x".repeat(281);
    expect(validateSkillComponent({ ...SKILL_FRONT_MATTER, description: overlong }).valid).toBe(false);
    expect(validateSkillPackageManifest({ ...SKILL_PACKAGE, description: overlong }).valid).toBe(false);
    expect(validateAgentComponent({ ...AGENT_FRONT_MATTER, description: overlong }).valid).toBe(false);
    expect(validateAgentPackageManifest({ ...AGENT_PACKAGE, description: overlong }).valid).toBe(false);
  });
});
