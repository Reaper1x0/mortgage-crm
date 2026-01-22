const { jwtUtils } = require("../utils");
const { R4XX } = require("../Responses");

const isAuth = async (req, res, next) => {
  const jwt = req.headers.authorization;

  if (!jwt) return R4XX(res, 401, "No auth token provided.");

  try {
    let decoded = await jwtUtils.verifyToken(jwt);
    req.user = decoded?.sub;
    next();
  } catch (error) {
    R4XX(res, 401, "Invalid or expired auth token.");
  }
};

module.exports = isAuth;
