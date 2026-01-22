const crypto = require("crypto");

const generate128BitCryptoString = () => crypto.randomBytes(16).toString("hex");

module.exports = { generate128BitCryptoString };
