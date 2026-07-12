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
var PluginStorageEncryptionUnavailableError = class extends Error {
  code = "encryption-unavailable";
  pluginId;
  constructor(pluginId) {
    super(
      `[plugin-storage:${pluginId}] OS encryption is unavailable \u2014 encrypted storage cannot be used (no plaintext fallback)`
    );
    this.name = "PluginStorageEncryptionUnavailableError";
    this.pluginId = pluginId;
  }
};
export {
  INCOMPATIBLE_APP_VERSION_CODE,
  IncompatibleAppVersionError,
  MissingDependenciesError,
  MissingPluginDependenciesError,
  PluginStorageEncryptionUnavailableError
};
