import {
  LVIS_TOKEN_NAMES
} from "../../chunk-AGR6M7NI.js";

// src/ui/tokens/validate.ts
var _LVIS_VAR_REF = /var\(\s*(--lvis-[a-z0-9-]+)/gi;
var _LVIS_DEF = /(?:^|[{};])\s*(--lvis-[a-z0-9-]+)\s*:/gi;
var _CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
var _CSS_STRING = /(["'])(?:\\.|(?!\1).)*\1/g;
var _ALLOWED_TOKENS = new Set(LVIS_TOKEN_NAMES);
function stripCommentsAndStrings(css) {
  return css.replace(_CSS_COMMENT, "").replace(_CSS_STRING, "");
}
function findLvisTokenReferences(css) {
  const out = /* @__PURE__ */ new Set();
  for (const m of stripCommentsAndStrings(css).matchAll(_LVIS_VAR_REF)) out.add(m[1]);
  return out;
}
function findLvisTokenDefinitions(css) {
  const out = /* @__PURE__ */ new Set();
  for (const m of stripCommentsAndStrings(css).matchAll(_LVIS_DEF)) out.add(m[1]);
  return out;
}
function validateTokenUsage(css, allowlist = _ALLOWED_TOKENS) {
  const refs = findLvisTokenReferences(css);
  const unknown = [];
  for (const r of refs) if (!allowlist.has(r)) unknown.push(r);
  return { ok: unknown.length === 0, unknown: unknown.sort() };
}
function validateTokenDefinitions(css, options = {}) {
  const { allowDefinitions = false, allowlist = _ALLOWED_TOKENS } = options;
  const defs = findLvisTokenDefinitions(css);
  const unknown = [];
  const forbiddenRedefinitions = [];
  for (const d of defs) {
    if (!allowlist.has(d)) unknown.push(d);
    else if (!allowDefinitions) forbiddenRedefinitions.push(d);
  }
  return {
    ok: unknown.length === 0 && forbiddenRedefinitions.length === 0,
    unknown: unknown.sort(),
    forbiddenRedefinitions: forbiddenRedefinitions.sort()
  };
}
export {
  findLvisTokenDefinitions,
  findLvisTokenReferences,
  validateTokenDefinitions,
  validateTokenUsage
};
