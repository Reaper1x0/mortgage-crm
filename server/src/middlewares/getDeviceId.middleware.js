const { R4XX } = require("../Responses");

const getDeviceId = (req, res, next) => {
  const deviceId = req.headers.device_id;
  if (!deviceId) return R4XX(res, 400, "No device_id provided");
  req.device = deviceId;
  next();
};

module.exports = getDeviceId;
