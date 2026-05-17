// src/index.ts
import { createRequire } from "module";
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
var _require = createRequire(import.meta.url);
var _cachedValidator = null;
function compileManifestValidator() {
  if (_cachedValidator) return _cachedValidator;
  const { default: Ajv } = _require("ajv");
  const schema = _require("../schemas/plugin-manifest.schema.json");
  const ajv = new Ajv({ strict: true, strictRequired: false, allErrors: true, useDefaults: false });
  ajv.addFormat("uri", { validate: () => true });
  _cachedValidator = ajv.compile(schema);
  return _cachedValidator;
}
export {
  MissingDependenciesError,
  compileManifestValidator
};
