const { R4XX } = require("../Responses");
const { catchAsync } = require("../utils");

const isNotLoggedIn = catchAsync((req, res, next) => {
  const jwt = req.headers.authorization;
  if (jwt)
    return R4XX(res, 409, "A user is already logged in", {
      message:
        "Make sure to remove jwt from headers before accessing this route.",
    });
  next();
});

module.exports = isNotLoggedIn;
