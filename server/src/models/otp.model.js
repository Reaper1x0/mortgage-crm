const mongoose = require("mongoose");
const { ALLOWED_OTP_TYPES } = require("../constants");

const otpSchema = mongoose.Schema({
  otp: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  for: {
    required: true,
    type: mongoose.Schema.Types.String,
    enum: ALLOWED_OTP_TYPES,
  },
  userId: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 10 * 60,
  },
});

const OTP = mongoose.model("otps", otpSchema);
module.exports = OTP;
