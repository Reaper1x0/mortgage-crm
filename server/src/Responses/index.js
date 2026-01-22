const R2XX = (res, message = "", statusCode = 200, props = {}) => {
  return res.status(statusCode).json({ success: true, message, ...props });
};

const R4XX = (res, statusCode = 400, reason = "", props = {}) => {
  return res.status(statusCode).json({ success: false, reason, ...props });
};

const R5XX = (res, props = {}) => {
  return res
    .status(500)
    .json({ success: false, reason: "Internal server error", ...props });
};

module.exports = { R2XX, R4XX, R5XX };
