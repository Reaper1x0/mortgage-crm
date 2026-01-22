const { MONGO_URI } = require("./env.config");

const mongoose = {
  url: MONGO_URI,
  options: {},
};

module.exports = mongoose;
