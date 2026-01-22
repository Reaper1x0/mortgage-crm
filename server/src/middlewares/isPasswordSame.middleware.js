const { R4XX } = require("../Responses");
const { catchAsync, bcryptUtils } = require("../utils");

const isPasswordSame = catchAsync(async (req, res, next) => {
  const user = req.userInfo;
  const { newPassword } = req.body;

  const isPasswordSame = await bcryptUtils.comparePasswords(
    newPassword,
    user.password
  );

  if (isPasswordSame)
    return R4XX(
      res,
      409,
      "New password must be different from the current one."
    );

  next();
});

module.exports = isPasswordSame;
