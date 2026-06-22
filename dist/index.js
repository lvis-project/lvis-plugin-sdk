// src/index.ts
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
  MissingPluginDependenciesError
};
