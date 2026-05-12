const { R4XX } = require("../Responses");

/**
 * @param {string|string[]} keys
 * @param {{ mode?: 'all'|'any', scope?: 'organization'|'workspace'|'either' }} [options]
 */
const requirePermission = (keys, options = {}) => {
  const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
  const mode = options.mode || "all";
  const scope = options.scope || "workspace";

  return (req, res, next) => {
    try {
      if (!req.user) {
        return R4XX(res, 401, "Unauthorized: user not found in request.");
      }

      const orgPerms = req.orgPermissions;
      const wsPerms = req.workspacePermissions;
      const hasOrgSet = orgPerms instanceof Set;
      const hasWsSet = wsPerms instanceof Set;

      if (scope === "organization" && !hasOrgSet) {
        return R4XX(res, 403, "Forbidden: permission context missing.", {
          code: "AUTHZ_CONTEXT_MISSING",
          scope,
        });
      }
      if (scope === "workspace" && !hasWsSet) {
        return R4XX(res, 403, "Forbidden: permission context missing.", {
          code: "AUTHZ_CONTEXT_MISSING",
          scope,
        });
      }
      if (scope === "either" && !hasOrgSet && !hasWsSet) {
        return R4XX(res, 403, "Forbidden: permission context missing.", {
          code: "AUTHZ_CONTEXT_MISSING",
          scope,
        });
      }

      const hasKey = (k) => {
        if (scope === "organization") return orgPerms.has(k);
        if (scope === "workspace") return wsPerms.has(k);
        return (hasOrgSet && orgPerms.has(k)) || (hasWsSet && wsPerms.has(k));
      };

      const satisfied =
        mode === "any" ? list.some((k) => hasKey(k)) : list.length === 0 ? true : list.every((k) => hasKey(k));

      if (!satisfied) {
        return R4XX(res, 403, "Forbidden: insufficient permissions.", {
          code: "FORBIDDEN_PERMISSION",
          required: list,
          scope,
          mode,
        });
      }

      next();
    } catch (_err) {
      return R4XX(res, 500, "Server error during permission validation.");
    }
  };
};

module.exports = requirePermission;
