const { R4XX } = require("../Responses");
const { userService } = require("../services");
const { catchAsync } = require("../utils");

const isUsernameFree = catchAsync(async (req, res, next) => {
  const { username } = req.body;
  if (!username) return next();
  const existing = await userService.getUserByUserName(username);
  if (existing) return R4XX(res, 409, "Username already taken.");
  next();
});

module.exports = isUsernameFree;
