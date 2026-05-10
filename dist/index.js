// src/index.ts
var KNOWN_TOOL_CATEGORIES = ["read", "write", "network", "meta"];
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
export {
  KNOWN_TOOL_CATEGORIES,
  MissingDependenciesError
};
