// src/ui/tokens/index.ts
var LVIS_TOKEN_NAMES = [
  "--lvis-bg",
  "--lvis-surface",
  "--lvis-surface-overlay",
  "--lvis-fg",
  "--lvis-fg-muted",
  "--lvis-fg-disabled",
  "--lvis-primary",
  "--lvis-primary-fg",
  "--lvis-secondary",
  "--lvis-secondary-fg",
  "--lvis-danger",
  "--lvis-danger-fg",
  "--lvis-warning",
  "--lvis-warning-fg",
  "--lvis-success",
  "--lvis-success-fg",
  "--lvis-border",
  "--lvis-ring",
  "--lvis-radius-xs",
  "--lvis-radius-sm",
  "--lvis-radius",
  "--lvis-radius-lg",
  "--lvis-radius-full",
  "--lvis-text-xs",
  "--lvis-text-sm",
  "--lvis-text-base",
  "--lvis-text-lg",
  "--lvis-weight-normal",
  "--lvis-weight-medium",
  "--lvis-weight-semibold",
  "--lvis-space-1",
  "--lvis-space-2",
  "--lvis-space-3",
  "--lvis-space-4",
  "--lvis-motion-fast",
  "--lvis-motion-normal"
];

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
