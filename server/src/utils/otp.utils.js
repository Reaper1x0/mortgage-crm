const otpGenerator = require("otp-generator");

const generate = () =>
  otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
  });

module.exports = { generate };
