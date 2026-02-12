const Joi = require("joi");
const { fullName, usernameValidator } = require("./custom.validation");
const { AUTH } = require("../constants");

const register = {
  body: Joi.object().keys({
    fullName: Joi.string()
      .required()
      .custom(fullName) // Ensures fullName contains only letters and spaces
      .messages({
        "string.pattern.base": AUTH.VALID_NAME,
      }),
    username: Joi.string()
      .required()
      .custom(usernameValidator) // Ensures fullName contains only letters and spaces
      .messages({
        "string.pattern.base": AUTH.VALID_USERNAME,
      }),
    email: Joi.string()
      .email({ tlds: { allow: false } }) // Allows any valid email
      .required()
      .messages({
        "string.email": AUTH.VALID_EMAIL,
      }),
    password: Joi.string().min(8).required().messages({
      "string.min": AUTH.PASSWORD_LENGTH,
      "any.required": AUTH.PASSWORD_REQUIRED,
    }),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string()
      .email({ tlds: { allow: false } }) // Allows any valid email
      .required()
      .messages({
        "string.email": AUTH.VALID_EMAIL,
      }),
    password: Joi.string().required().messages({
      "any.required": AUTH.PASSWORD_REQUIRED,
    }),
  }),
};

const verifyEmail = {
  body: Joi.object().keys({
    otp: Joi.string().min(6).max(6).required().messages({
      "string.empty": AUTH.OTP_EMPTY,
      "string.min": AUTH.OTP_LENGTH,
      "string.max": AUTH.OTP_LENGTH,
      "any.required": AUTH.OTP_REQUIRED,
    }),
  }),
};

const forgetPassword = {
  body: Joi.object().keys({
    email: Joi.string()
      .email({ tlds: { allow: false } }) // Allows any valid email
      .required()
      .messages({
        "string.email": AUTH.VALID_EMAIL,
      }),
  }),
};

const resetPasswordOtpVerifiction = {
  body: Joi.object().keys({
    email: Joi.string()
      .email({ tlds: { allow: false } }) // Allows any valid email
      .required()
      .messages({
        "string.email": AUTH.VALID_EMAIL,
      }),
    otp: Joi.string().min(6).max(6).required().messages({
      "string.empty": AUTH.OTP_EMPTY,
      "string.min": AUTH.OTP_LENGTH,
      "string.max": AUTH.OTP_LENGTH,
      "any.required": AUTH.OTP_REQUIRED,
    }),
  }),
};

const resetPassword = {
  body: Joi.object().keys({
    email: Joi.string()
      .email({ tlds: { allow: false } }) // Allows any valid email
      .required()
      .messages({
        "string.email": AUTH.VALID_EMAIL,
      }),
    newPassword: Joi.string().min(8).required().messages({
      "any.required": AUTH.NEWPASSWORD_REQUIRED,
      "string.min": AUTH.PASSWORD_LENGTH,
    }),
  }),
};

const changePassword = {
  body: Joi.object().keys({
    currentPassword: Joi.string().required().messages({
      "any.required": AUTH.PASSWORD_REQUIRED,
    }),
    newPassword: Joi.string().min(8).required().messages({
      "any.required": AUTH.NEWPASSWORD_REQUIRED,
      "string.min": AUTH.PASSWORD_LENGTH,
    }),
  }),
};

module.exports = {
  register,
  login,
  verifyEmail,
  forgetPassword,
  resetPasswordOtpVerifiction,
  resetPassword,
  changePassword,
};
