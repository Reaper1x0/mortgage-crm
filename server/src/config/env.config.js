const Joi = require("joi");
require("dotenv").config(); // <-- loads .env directly

// Validate ENV variables
const envVarsSchema = Joi.object({
  PORT: Joi.number().default(3000),
  MONGO_URI: Joi.string().required().label("MONGO_URI"),
  SMTP_HOST: Joi.string().required().label("SMTP_HOST"),
  SMTP_PORT: Joi.number().required().label("SMTP_PORT"),
  EMAIL_USER: Joi.string().required().label("EMAIL_USER"),
  EMAIL_PASS: Joi.string().required().label("EMAIL_PASS"),
  FRONTEND_URL: Joi.string().required().label("FRONTEND_URL"),
})
  .unknown()
  .prefs({ errors: { label: "key" } });

const { error } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Export clean values
module.exports = {
  PORT: process.env.PORT,
  GPT_MODEL: process.env.GPT_MODEL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  MONGO_URI: process.env.MONGO_URI,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  FRONTEND_URL: process.env.FRONTEND_URL,
};
