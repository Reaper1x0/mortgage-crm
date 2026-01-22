const { emailConfig } = require("../config");

const EmailService = {
  sendEmail: async (to, subject, html, text = "") => {
    const msg = { from: process.env.EMAIL_USER, to, subject, text, html };
    return await emailConfig.sendMail(msg);
  },
};

module.exports = EmailService;
