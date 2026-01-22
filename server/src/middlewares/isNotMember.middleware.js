const { R4XX } = require("../Responses");
const { userService } = require("../services");
const { catchAsync } = require("../utils");

const isNotMember = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await userService.getUserByEmail(email);
  if (!user) return R4XX(res, 404, "Account against this email does not exist");
  req.userInfo = user;
  next();
});

module.exports = isNotMember;
