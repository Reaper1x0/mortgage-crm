const nodemailer = require("nodemailer");
const {
  SMTP_HOST,
  SMTP_PORT,
  EMAIL_USER,
  EMAIL_PASS,
} = require("./env.config");

const config = {
  smtp: {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  },
  from: EMAIL_USER,
};

const transport = nodemailer.createTransport(config.smtp);
module.exports = transport;
