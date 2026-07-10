// src/index.ts
import { createRequire } from "module";
var requireFromSdk = createRequire(import.meta.url);
function compileManifestValidator() {
  const AjvModule = requireFromSdk("ajv");
  const AddFormatsModule = requireFromSdk("ajv-formats");
  const AjvCtor = AjvModule.default ?? AjvModule;
  const addFormats = AddFormatsModule.default ?? AddFormatsModule;
  const ajv = new AjvCtor({
    strict: true,
    strictRequired: false,
    allErrors: true,
    allowUnionTypes: true
  });
  addFormats(ajv);
  return ajv.compile(requireFromSdk("../schemas/plugin-manifest.schema.json"));
}
var MissingDependenciesError = class extends Error {
  missing;
  constructor(missing) {
    super(
      `Plugin requires capabilities not provided by installed plugins: ${missing.join(", ")}`
    );
    this.missing = missing;
    this.name = "MissingDependenciesError";
  }
};
var IncompatibleAppVersionError = class extends Error {
  required;
  current;
  constructor(required, current) {
    super(`plugin requires LVIS >= ${required}, current ${current}`);
    this.required = required;
    this.current = current;
    this.name = "IncompatibleAppVersionError";
  }
};
var INCOMPATIBLE_APP_VERSION_CODE = "incompatible-app-version";
var MissingPluginDependenciesError = class extends Error {
  missing;
  constructor(missing) {
    super(
      `Plugin requires the following plugins to be installed first: ${missing.join(", ")}`
    );
    this.missing = missing;
    this.name = "MissingPluginDependenciesError";
  }
};
var normalizeManifest = (raw, report) => {
  const DUAL = ["model", "app"];
  const stripLegacyMaps = (manifest) => {
    const { toolSchemas: _schemas, uiActions: _actions, tools: _tools, ...rest } = manifest;
    return rest;
  };
  const isLegacy = raw.tools.length === 0 || typeof raw.tools[0] === "string";
  if (!isLegacy) {
    const tools2 = raw.tools.map((tool) => {
      const visibility = tool._meta?.ui?.visibility;
      if (visibility === void 0) {
        return {
          ...tool,
          _meta: { ...tool._meta, ui: { ...tool._meta?.ui, visibility: [...DUAL] } }
        };
      }
      if (visibility.length === 0) {
        throw new Error(
          `[normalizeManifest] plugin '${raw.id}' tool '${tool.name}': _meta.ui.visibility is [] \u2014 a tool must be reachable by \u22651 surface (SoT \xA72.2/\xA72.3)`
        );
      }
      return tool;
    });
    return { ...stripLegacyMaps(raw), tools: tools2 };
  }
  const names = raw.tools;
  const uiNames = Object.keys(raw.uiActions ?? {});
  const schemas = raw.toolSchemas ?? {};
  const removed = [
    "category",
    "workerId",
    "writesToOwnSandbox",
    "version",
    "deprecatedSince",
    "replacedBy"
  ];
  const dropped = /* @__PURE__ */ new Set();
  const deriveVisibility = (inModel, inApp) => {
    if (inModel && inApp) return ["model", "app"];
    if (inModel) return ["model"];
    if (inApp) return ["app"];
    throw new Error(
      `[normalizeManifest] plugin '${raw.id}': a tool is reachable by neither surface (not in tools[] nor uiActions) \u2014 every tool needs \u22651 surface (SoT \xA72.3)`
    );
  };
  const allNames = [...names, ...uiNames.filter((name) => !names.includes(name))];
  const tools = allNames.map((name) => {
    const schema = schemas[name];
    const meta = {
      ui: { visibility: deriveVisibility(names.includes(name), uiNames.includes(name)) }
    };
    if (schema?.pathFields && schema.pathFields.length > 0) {
      meta["xyz.lvis/pathFields"] = schema.pathFields;
    }
    for (const field of removed) {
      if (schema?.[field] !== void 0) dropped.add(field);
    }
    return {
      name,
      ...schema?.description === void 0 ? {} : { description: schema.description },
      inputSchema: schema?.inputSchema ?? { type: "object", properties: {} },
      _meta: meta
    };
  });
  report?.({ pluginId: raw.id, kind: "legacy-shape", droppedFields: [...dropped] });
  return { ...stripLegacyMaps(raw), tools };
};
export {
  INCOMPATIBLE_APP_VERSION_CODE,
  IncompatibleAppVersionError,
  MissingDependenciesError,
  MissingPluginDependenciesError,
  compileManifestValidator,
  normalizeManifest
};
