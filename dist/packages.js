// src/packages.ts
import { readFileSync } from "fs";
import { createRequire } from "module";
var SKILL_PACKAGE_SCHEMA_URL = "https://sdk.lvisai.xyz/schemas/skill.schema.json";
var AGENT_PACKAGE_SCHEMA_URL = "https://sdk.lvisai.xyz/schemas/agent.schema.json";
var SKILL_COMPONENT_POINTER = "#/$defs/skillComponent";
var AGENT_COMPONENT_POINTER = "#/$defs/agentComponent";
var SKILL_COMPONENT_REF = `${SKILL_PACKAGE_SCHEMA_URL}${SKILL_COMPONENT_POINTER}`;
var AGENT_COMPONENT_REF = `${AGENT_PACKAGE_SCHEMA_URL}${AGENT_COMPONENT_POINTER}`;
var SKILL_PACKAGE_SCHEMA_FILE = "schemas/skill-package.schema.json";
var AGENT_PACKAGE_SCHEMA_FILE = "schemas/agent-package.schema.json";
var PACKAGE_VALIDATOR_PEER = "ajv";
var PackageValidatorDependencyError = class extends Error {
  constructor(cause) {
    super(
      `@lvis/plugin-sdk/packages validators need the optional peer dependency "${PACKAGE_VALIDATOR_PEER}" (>=8). Install it to call the validators; the schema files and types are usable without it.`,
      { cause }
    );
    this.name = "PackageValidatorDependencyError";
  }
};
var registry;
function loadAjv2020() {
  const require2 = createRequire(import.meta.url);
  try {
    return require2(`${PACKAGE_VALIDATOR_PEER}/dist/2020.js`).default;
  } catch (error) {
    throw new PackageValidatorDependencyError(error);
  }
}
function schemaRegistry() {
  if (registry === void 0) {
    const Ajv = loadAjv2020();
    const ajv = new Ajv({ strict: true, allErrors: true });
    for (const file of [SKILL_PACKAGE_SCHEMA_FILE, AGENT_PACKAGE_SCHEMA_FILE]) {
      const url = new URL(`../${file}`, import.meta.url);
      ajv.addSchema(JSON.parse(readFileSync(url, "utf8")));
    }
    registry = ajv;
  }
  return registry;
}
var compiled = /* @__PURE__ */ new Map();
function validator(ref) {
  let fn = compiled.get(ref);
  if (fn === void 0) {
    const ajv = schemaRegistry();
    if (ref.includes("#")) {
      fn = ajv.compile({ $ref: ref });
    } else {
      const registered = ajv.getSchema(ref);
      if (registered === void 0) {
        throw new Error(`package schema ${ref} is not registered; the schema files under schemas/ are out of step with this module`);
      }
      fn = registered;
    }
    compiled.set(ref, fn);
  }
  return fn;
}
function report(fn, document) {
  if (fn(document)) return { valid: true, value: document };
  const issues = (fn.errors ?? []).map((error) => ({
    path: error.instancePath,
    message: error.message ?? error.keyword
  }));
  return { valid: false, issues };
}
function validateSkillPackageManifest(document) {
  return report(validator(SKILL_PACKAGE_SCHEMA_URL), document);
}
function validateAgentPackageManifest(document) {
  return report(validator(AGENT_PACKAGE_SCHEMA_URL), document);
}
function validateSkillComponent(frontMatter) {
  return report(validator(SKILL_COMPONENT_REF), frontMatter);
}
function validateAgentComponent(frontMatter) {
  return report(validator(AGENT_COMPONENT_REF), frontMatter);
}
export {
  AGENT_COMPONENT_POINTER,
  AGENT_COMPONENT_REF,
  AGENT_PACKAGE_SCHEMA_FILE,
  AGENT_PACKAGE_SCHEMA_URL,
  PACKAGE_VALIDATOR_PEER,
  PackageValidatorDependencyError,
  SKILL_COMPONENT_POINTER,
  SKILL_COMPONENT_REF,
  SKILL_PACKAGE_SCHEMA_FILE,
  SKILL_PACKAGE_SCHEMA_URL,
  validateAgentComponent,
  validateAgentPackageManifest,
  validateSkillComponent,
  validateSkillPackageManifest
};
