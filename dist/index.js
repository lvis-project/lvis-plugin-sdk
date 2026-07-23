// src/index.ts
var HOST_EXTERNAL_MODULES = ["electron"];
var HOST_BROWSER_EXTERNAL_MODULES = ["react", "react-dom"];
var BUNDLE_EVERYTHING_REGEX = new RegExp(".*");
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
var PluginStorageError = class extends Error {
  pluginId;
  attemptedPath;
  constructor(message, pluginId, attemptedPath) {
    super(`[plugin-storage:${pluginId}] ${message}: ${attemptedPath}`);
    this.name = "PluginStorageError";
    this.pluginId = pluginId;
    this.attemptedPath = attemptedPath;
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
  BUNDLE_EVERYTHING_REGEX,
  HOST_BROWSER_EXTERNAL_MODULES,
  HOST_EXTERNAL_MODULES,
  INCOMPATIBLE_APP_VERSION_CODE,
  IncompatibleAppVersionError,
  MissingDependenciesError,
  MissingPluginDependenciesError,
  PluginStorageEncryptionUnavailableError,
  PluginStorageError
};
