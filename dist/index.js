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
var normalizeManifest = (raw, report) => {
  const DUAL = ["model", "app"];
  const stripLegacyMaps = (m) => {
    const { toolSchemas: _s, uiActions: _u, tools: _t, ...rest } = m;
    return rest;
  };
  const isLegacy = raw.tools.length === 0 || typeof raw.tools[0] === "string";
  if (!isLegacy) {
    const tools2 = raw.tools.map((t) => {
      const vis = t._meta?.ui?.visibility;
      if (vis === void 0) {
        return { ...t, _meta: { ...t._meta, ui: { ...t._meta?.ui, visibility: DUAL } } };
      }
      if (vis.length === 0) {
        throw new Error(
          `[normalizeManifest] plugin '${raw.id}' tool '${t.name}': _meta.ui.visibility is [] \u2014 a tool must be reachable by \u22651 surface; empty is rejected (SoT \xA72.2/\xA72.3)`
        );
      }
      return t;
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
  const allNames = [...names, ...uiNames.filter((n) => !names.includes(n))];
  const tools = allNames.map((name) => {
    const schema = schemas[name];
    const meta = {
      ui: { visibility: deriveVisibility(names.includes(name), uiNames.includes(name)) }
    };
    if (schema?.pathFields && schema.pathFields.length > 0) {
      meta["xyz.lvis/pathFields"] = schema.pathFields;
    }
    if (schema) {
      for (const f of removed) {
        if (schema[f] !== void 0) dropped.add(f);
      }
    }
    return {
      name,
      ...schema?.description !== void 0 ? { description: schema.description } : {},
      inputSchema: schema?.inputSchema ?? { type: "object", properties: {} },
      _meta: meta
    };
  });
  report?.({ pluginId: raw.id, kind: "legacy-shape", droppedFields: [...dropped] });
  return { ...stripLegacyMaps(raw), tools };
};
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
export {
  INCOMPATIBLE_APP_VERSION_CODE,
  IncompatibleAppVersionError,
  MissingDependenciesError,
  MissingPluginDependenciesError,
  compileManifestValidator,
  normalizeManifest
};
