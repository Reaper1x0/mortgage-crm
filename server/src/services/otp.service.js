const { OTP_TYPES } = require("../constants");
const { Otp } = require("../models");

const OtpService = {
  saveOtp: async (otp, user, type) => {
    const newOtp = new Otp({
      otp,
      userId: user?._id,
      for: type,
    });
    await newOtp.save();
  },

  getOtp: async function (data, type) {
    const filters = {
      otp: data.otp,
      userId: data.userId,
      for: type,
    };
    const otp = await Otp.findOne(filters);

    if (otp) await this.deleteOTPs(data.userId, type);

    return Boolean(otp);
  },

  deleteOTPs: async (userId, type) => {
    await Otp.deleteMany({ userId, for: type });
  },
};

module.exports = OtpService;
