const { jwtUtils } = require("../utils");
const { R4XX } = require("../Responses");
const { userService } = require("../services");

const isAuth = async (req, res, next) => {
  const jwt = req.headers.authorization;

  if (!jwt) return R4XX(res, 401, "No auth token provided.");

  try {
    const decoded = await jwtUtils.verifyToken(jwt);
    req.user = decoded?.sub;
    const user = await userService.getUserById(req.user);
    if (!user) return R4XX(res, 401, "Invalid auth token user.");
    req.authUser = user;
    next();
  } catch (error) {
    R4XX(res, 401, "Invalid or expired auth token.");
  }
};

module.exports = isAuth;
