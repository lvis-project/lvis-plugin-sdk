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
var normalizeManifest = (manifest) => {
  const DUAL = ["model", "app"];
  const tools = manifest.tools.map((t) => {
    const vis = t._meta?.ui?.visibility;
    if (vis === void 0) {
      return { ...t, _meta: { ...t._meta, ui: { ...t._meta?.ui, visibility: DUAL } } };
    }
    if (vis.length === 0) {
      throw new Error(
        `[normalizeManifest] plugin '${manifest.id}' tool '${t.name}': _meta.ui.visibility is [] \u2014 a tool must be reachable by \u22651 surface; empty is rejected (SoT \xA72.2/\xA72.3)`
      );
    }
    return t;
  });
  return { ...manifest, tools };
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
