const { Router } = require("express");
const { authValidation } = require("../validations");
const { authController } = require("../controllers");

const {
  validate,
  isAuth,
  isMember,
  isNotLoggedIn,
  isNotMember,
  isPasswordSame,
  getDeviceId,
} = require("../middlewares");
const isAuthOptional = require("../middlewares/isAuthOptional.middleware");

const router = Router();

router.post(
  "/register",
  isNotLoggedIn,
  validate(authValidation.register),
  isMember,
  authController.register
);

router.post(
  "/login",
  isNotLoggedIn,
  getDeviceId,
  validate(authValidation.login),
  authController.login
);

router.get(
  "/resend-email-verification-otp",
  isAuth,
  authController.resendEmailVerificationOTP
);

router.post(
  "/verify-email",
  isAuth,
  validate(authValidation.verifyEmail),
  authController.verifyEmail
);

router.post(
  "/forget-password",
  isNotLoggedIn,
  validate(authValidation.forgetPassword),
  isNotMember,
  authController.forgotPassword
);

router.post(
  "/reset-password-otp-verification",
  isNotLoggedIn,
  validate(authValidation.resetPasswordOtpVerifiction),
  isNotMember,
  authController.resetPasswordOtpVerifiction
);

router.post(
  "/resend-password-reset-otp",
  isNotLoggedIn,
  validate(authValidation.forgetPassword),
  isNotMember,
  authController.resendPasswordResetOTP
);

router.put(
  "/reset-password",
  isNotLoggedIn,
  validate(authValidation.resetPassword),
  isNotMember,
  isPasswordSame,
  authController.resetPassword
);

router.delete("/logout", isAuth, getDeviceId, authController.logout);

router.get("/refresh", getDeviceId, authController.refresh);

router.get("/profile", isAuth, isMember, authController.getProfile);

router.post("/update-profile", isAuth, authController.updateProfile);

router.get("/username-availbility/:username", isAuthOptional, authController.getUserNameAvailibility);

module.exports = router;
