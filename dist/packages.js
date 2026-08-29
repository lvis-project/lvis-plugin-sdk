// src/packages.ts
import { readFileSync } from "fs";
import Ajv2020 from "ajv/dist/2020.js";
var SKILL_PACKAGE_SCHEMA_URL = "https://sdk.lvisai.xyz/schemas/skill.schema.json";
var AGENT_PACKAGE_SCHEMA_URL = "https://sdk.lvisai.xyz/schemas/agent.schema.json";
var SKILL_COMPONENT_POINTER = "#/$defs/skillComponent";
var AGENT_COMPONENT_POINTER = "#/$defs/agentComponent";
var SKILL_COMPONENT_REF = `${SKILL_PACKAGE_SCHEMA_URL}${SKILL_COMPONENT_POINTER}`;
var AGENT_COMPONENT_REF = `${AGENT_PACKAGE_SCHEMA_URL}${AGENT_COMPONENT_POINTER}`;
var SKILL_PACKAGE_SCHEMA_FILE = "schemas/skill-package.schema.json";
var AGENT_PACKAGE_SCHEMA_FILE = "schemas/agent-package.schema.json";
var registry;
function schemaRegistry() {
  if (registry === void 0) {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
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
    fn = ref.includes("#") ? ajv.compile({ $ref: ref }) : ajv.getSchema(ref);
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
  SKILL_COMPONENT_POINTER,
  SKILL_COMPONENT_REF,
  SKILL_PACKAGE_SCHEMA_FILE,
  SKILL_PACKAGE_SCHEMA_URL,
  validateAgentComponent,
  validateAgentPackageManifest,
  validateSkillComponent,
  validateSkillPackageManifest
};
