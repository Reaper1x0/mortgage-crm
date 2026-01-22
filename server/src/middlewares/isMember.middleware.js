const { R4XX } = require("../Responses");
const { userService } = require("../services");
const { catchAsync } = require("../utils");

const isMember = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await userService.getUserByEmail(email);
  if (user) return R4XX(res, 409, `Email already exist!`);
  next();
});

module.exports = isMember;
