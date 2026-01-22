module.exports.AUTH = {
  VALID_NAME: "Name must only contain letters and spaces.",
  VALID_USERNAME: "Username must start with a letter and contain only letters, numbers, underscores or dots (3–20 chars).",
  VALID_EMAIL: "Email must be a valid email address.",
  PASSWORD_LENGTH: "Password must be at least 8 characters long.",
  PASSWORD_REQUIRED: "Password is required.",
  NEWPASSWORD_REQUIRED: "newPassword is required.",
  OTP_REQUIRED: "OTP is required.",
  OTP_EMPTY: "OTP can not be empty",
  OTP_LENGTH: "OTP must be of 6 digit.",
};

module.exports.ALLOWED_OTP_TYPES = ["email_verification", "password_reset"];

module.exports.OTP_TYPES = {
  EMAILVER: "email_verification",
  PASSRES: "password_reset",
};

module.exports.TOKENS = {
  ACCESS: "access",
  REFRESH: "refresh",
  ACCESS_EXPIRY: "1h",
  REFRESH_EXPIRY: "1w",
};
