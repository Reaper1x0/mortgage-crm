const { jwtUtils } = require("../utils");
const { R4XX } = require("../Responses");

const isAuthOptional = async (req, res, next) => {
  const jwt = req.headers.authorization;
  if (!jwt) return next();

  try {
    let decoded = await jwtUtils.verifyToken(jwt);
    req.user = decoded?.sub;
    return next();
  } catch (error) {
    R4XX(res, 401, "Invalid or expired auth token.");
  }
};

module.exports = isAuthOptional;
