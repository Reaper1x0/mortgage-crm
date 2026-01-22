const ejs = require("ejs");
const path = require("path");
const { R2XX, R4XX } = require("../Responses");
const { catchAsync, jwtUtils, otpUtils } = require("../utils");
const {
  userService,
  emailService,
  authService,
  otpService,
} = require("../services");
const { OTP_TYPES, TOKENS } = require("../constants");
const { sanitizers } = require("../sanitizers");

const AuthController = {
  register: catchAsync(async (req, res) => {
    const newUser = await authService.register(req.body);
    R2XX(res, "User registered successfully. Now you can login.", 201, {
      user: sanitizers.userSanitizer(newUser),
    });
  }),

  login: catchAsync(async (req, res) => {
    const user = await authService.login(req.body);
    if (!user) return R4XX(res, 401, "Incorrect email or password");

    const accessToken = await jwtUtils.issueJWT(
      { _id: user?._id },
      TOKENS.ACCESS,
      TOKENS.ACCESS_EXPIRY
    );

    const refreshToken = await jwtUtils.issueJWT(
      { _id: user?._id },
      TOKENS.REFRESH,
      TOKENS.REFRESH_EXPIRY
    );
    user.refreshTokens = user.refreshTokens.filter(
      (tokenObj) => tokenObj.device_id !== req.device
    );
    user.refreshTokens.push({
      token: refreshToken,
      device_id: req.device,
    });

    if (!user.isEmailVerified) {
      await otpService.deleteOTPs(user._id, OTP_TYPES.EMAILVER);
      const otp = otpUtils.generate();
      await otpService.saveOtp(otp, user, OTP_TYPES.EMAILVER);
      const emailTemplatePath = path.join(
        __dirname,
        "../email-templates/verification.ejs"
      );
      let html = await ejs.renderFile(emailTemplatePath, {
        otp,
      });
      await emailService.sendEmail(user.email, "Verify your email", html);
    }

    await user.save();

    R2XX(
      res,
      `User logged in successfully. ${
        user.isEmailVerified ? "" : " Please check your email for verification."
      }`,
      200,
      {
        user: sanitizers.userSanitizer(user),
        accessToken,
        refreshToken,
      }
    );
  }),

  logout: catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.user);
    if (!user) return R4XX(res, 404, "User not found");
    user.refreshTokens = user.refreshTokens.filter(
      (i) => i.device_id !== req.device
    );
    await user.save();
    R2XX(res, "Logged out successfully", 200);
  }),
  //Used to resend the OTP the users' email. Will delete the old tokens from the database and save the new one.
  resendEmailVerificationOTP: catchAsync(async (req, res) => {
    //Sending OTP to users' email for email verification.
    const user = await userService.getUserById(req.user);
    if (!user) return R4XX(res, 404, "User not found");
    if (user.isEmailVerified) return R2XX(res, "Email is already verified");
    //Deleting all previous OTPs before sending the new one.
    await otpService.deleteOTPs(user._id, OTP_TYPES.EMAILVER);
    const otp = otpUtils.generate();
    await otpService.saveOtp(otp, user, OTP_TYPES.EMAILVER);
    const emailTemplatePath = path.join(
      __dirname,
      "../email-templates/verification.ejs"
    );
    let html = await ejs.renderFile(emailTemplatePath, {
      otp,
    });

    await emailService.sendEmail(user.email, "Verify your email", html);

    R2XX(res, "OTP sent to email", 200);
  }),
  //Used to match the OTP in database and the one comming in the request body. If matched update the user and set isEmailVerified to true.
  verifyEmail: catchAsync(async (req, res) => {
    const { otp } = req.body;

    const user = await userService.getUserById(req.user);

    if (user.isEmailVerified) return R2XX(res, "Email is already verified");

    const doesOtpMatch = await otpService.getOtp(
      { userId: req.user, otp },
      OTP_TYPES.EMAILVER
    );

    if (!doesOtpMatch) return R4XX(res, 400, "OTP is invalid/expired.");

    const updatedUser = await userService.updateUserById(req.user, {
      isEmailVerified: true,
    });

    if (!updatedUser) return R4XX(res, 404, "User not found");

    R2XX(res, "Email verified successfully", 200, {
      user: sanitizers.userSanitizer(updatedUser),
    });
  }),
  //Used to get email from the request body and send OTP to that email if it is member of the system.
  forgotPassword: catchAsync(async (req, res) => {
    const user = req.userInfo;

    await otpService.deleteOTPs(user._id, OTP_TYPES.PASSRES);

    const emailTemplatePath = path.join(
      __dirname,
      "../email-templates/forget-password.ejs"
    );
    const otp = otpUtils.generate();

    await otpService.saveOtp(otp, user, OTP_TYPES.PASSRES);

    let html = await ejs.renderFile(emailTemplatePath, {
      otp,
    });

    await emailService.sendEmail(user.email, "Reset your password", html);

    R2XX(res, "OTP sent to email", 200);
  }),
  //Used to resend the OTP to the users' email. Will delete the old tokens from the database and save the new one.
  resendPasswordResetOTP: catchAsync(async (req, res) => {
    const user = req.userInfo;
    await otpService.deleteOTPs(user._id, OTP_TYPES.PASSRES);

    const otp = otpUtils.generate();
    await otpService.saveOtp(otp, user, OTP_TYPES.PASSRES);

    const emailTemplatePath = path.join(
      __dirname,
      "../email-templates/forget-password.ejs"
    );

    let html = await ejs.renderFile(emailTemplatePath, {
      otp,
    });

    await emailService.sendEmail(user.email, "Reset your password", html);

    R2XX(res, "OTP sent to email", 200);
  }),
  //Used to match the OTP in database and the one comming in the request body. If matched send 200 request back to client.
  resetPasswordOtpVerifiction: catchAsync(async (req, res) => {
    const { otp } = req.body;
    const user = req.userInfo;
    const doesOtpMatch = await otpService.getOtp(
      {
        otp,
        userId: user._id,
      },
      OTP_TYPES.PASSRES
    );

    if (doesOtpMatch)
      return R2XX(
        res,
        "OTP matched. You can now reset your password on next screen.",
        200
      );

    R4XX(res, 401, "OTP is invalid/expired.");
  }),
  //Used to update the user password in the database.
  resetPassword: catchAsync(async (req, res) => {
    const { newPassword } = req.body;
    const user = req.userInfo;
    await userService.updateUserById(user._id, {
      password: newPassword,
    });
    R2XX(res, "Password updated successfully.", 200);
  }),

  refresh: catchAsync(async (req, res, next) => {
    try {
      const refreshToken = req.headers["refresh-token"];
      const { sub } = await jwtUtils.verifyToken(refreshToken, TOKENS.REFRESH);
      const user = await userService.getUserById(sub);

      if (!user) return R4XX(res, 404, "User not found");

      const tokenIndex = user.refreshTokens.findIndex(
        (i) => i.token === refreshToken && i.device_id === req.device
      );

      if (tokenIndex < 0) throw Error("Un-authorized");

      const accessToken = await jwtUtils.issueJWT(
        { _id: user?._id },
        TOKENS.ACCESS,
        TOKENS.ACCESS_EXPIRY
      );

      const newRefreshToken = await jwtUtils.issueJWT(
        { _id: user?._id },
        TOKENS.REFRESH,
        TOKENS.REFRESH_EXPIRY
      );

      user.refreshTokens[tokenIndex] = {
        ...user.refreshTokens[tokenIndex],
        token: newRefreshToken,
      };

      await user.save();

      R2XX(res, "Access token sent successfully", 200, {
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      if (error.message === "Un-authorized")
        return R4XX(res, 401, "Invaild/expired refresh token.", {
          message: "Please login again",
        });
      next(error);
    }
  }),

  getProfile: catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.user);
    if (!user) return R4XX(res, 404, "User not found");

    R2XX(res, "User profile fetched successfully.", 200, {
      user: sanitizers.userSanitizer(user),
    });
  }),

  updateProfile: catchAsync(async (req, res) => {
    const userId = req.user; // coming from isAuth middleware
    const { fullName, username } = req.body;

    const user = await userService.getUserById(userId);
    if (!user) return R4XX(res, 404, "User not found");

    // Ensure username is unique if changed
    if (username && username !== user.username) {
      const exists = await userService.getUserByUserName(username);
      if (exists && exists._id.toString() !== userId) {
        return R4XX(res, 409, "Username already taken.");
      }
      user.username = username;
    }

    // Update fullName (no uniqueness check)
    if (fullName) user.fullName = fullName;

    const updatedUser = await user.save();

    R2XX(res, "Profile updated successfully.", 200, {
      user: sanitizers.userSanitizer(updatedUser),
    });
  }),

  getUserNameAvailibility: catchAsync(async (req, res) => {
    const { username } = req.params;
    const user = await userService.getUserByUserName(username);

    // Username does not exist → available
    if (!user) {
      return R2XX(res, "Username available.", 200);
    }

    // Username belongs to the same user
    if (user._id.toString() === req.user) {
      return R2XX(res, "This username is yours.", 200);
    }
    // Username is taken by someone else
    return R4XX(res, 400, "Username not available.");
  }),
};

module.exports = AuthController;
