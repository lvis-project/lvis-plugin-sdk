// src/index.ts
var HOST_EXTERNAL_MODULES = ["electron"];
var HOST_BROWSER_EXTERNAL_MODULES = ["react", "react-dom"];
var BUNDLE_EVERYTHING_REGEX = new RegExp(".*");
var AGENT_PLUGINS_SCHEMA_URL = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
var LVIS_EXTENSION_NAMESPACE = "xyz.lvisai";
var AGENT_PLUGINS_TOP_LEVEL_FIELDS = [
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions"
];
function foreignManifestTopLevelFields(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return [];
  }
  return Object.keys(document).filter(
    (key) => !AGENT_PLUGINS_TOP_LEVEL_FIELDS.includes(key)
  );
}
function flattenAgentPluginsManifest(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return document;
  }
  const top = document;
  const extensions = top.extensions;
  const namespaced = extensions && typeof extensions === "object" && !Array.isArray(extensions) ? extensions[LVIS_EXTENSION_NAMESPACE] : void 0;
  const lvis = namespaced && typeof namespaced === "object" && !Array.isArray(namespaced) ? namespaced : {};
  const { displayName, ...hostFields } = lvis;
  const flat = {
    ...hostFields,
    id: top.name,
    version: top.version,
    description: top.description
  };
  if (displayName !== void 0) flat.name = displayName;
  return flat;
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
  AGENT_PLUGINS_SCHEMA_URL,
  AGENT_PLUGINS_TOP_LEVEL_FIELDS,
  BUNDLE_EVERYTHING_REGEX,
  HOST_BROWSER_EXTERNAL_MODULES,
  HOST_EXTERNAL_MODULES,
  INCOMPATIBLE_APP_VERSION_CODE,
  IncompatibleAppVersionError,
  LVIS_EXTENSION_NAMESPACE,
  MissingDependenciesError,
  MissingPluginDependenciesError,
  PluginStorageEncryptionUnavailableError,
  PluginStorageError,
  flattenAgentPluginsManifest,
  foreignManifestTopLevelFields
};
