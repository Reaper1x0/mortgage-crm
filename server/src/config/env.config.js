const Joi = require("joi");
require("dotenv").config(); // <-- loads .env directly

// Validate ENV variables
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3000),
  MONGO_URI: Joi.string().required().label("MONGO_URI"),
  SMTP_HOST: Joi.string().required().label("SMTP_HOST"),
  SMTP_PORT: Joi.number().required().label("SMTP_PORT"),
  EMAIL_USER: Joi.string().required().label("EMAIL_USER"),
  EMAIL_PASS: Joi.string().required().label("EMAIL_PASS"),
  FRONTEND_URL: Joi.string().required().label("FRONTEND_URL"),
  AWS_REGION: Joi.string().required().label("AWS_REGION"),
  AWS_ACCESS_KEY_ID: Joi.string().required().label("AWS_ACCESS_KEY_ID"),
  AWS_SECRET_ACCESS_KEY: Joi.string().required().label("AWS_SECRET_ACCESS_KEY"),
  S3_BUCKET_NAME: Joi.string().required().label("S3_BUCKET_NAME"),
  S3_SIGNED_URL_EXPIRES: Joi.number().optional().default(3600).label("S3_SIGNED_URL_EXPIRES"),
  TEXTRACT_POLL_INTERVAL_MS: Joi.number()
    .integer()
    .min(500)
    .default(2000)
    .label("TEXTRACT_POLL_INTERVAL_MS"),
  TEXTRACT_MAX_POLLS: Joi.number()
    .integer()
    .min(10)
    .default(120)
    .label("TEXTRACT_MAX_POLLS"),
})
  .unknown()
  .prefs({ errors: { label: "key" } });

const { value: envVars, error } = envVarsSchema.validate(process.env, {
  abortEarly: false,
  convert: true,
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Export clean values
module.exports = {
  NODE_ENV: envVars.NODE_ENV,
  PORT: envVars.PORT,
  GPT_MODEL: envVars.GPT_MODEL,
  OPENAI_API_KEY: envVars.OPENAI_API_KEY,
  MONGO_URI: envVars.MONGO_URI,
  SMTP_HOST: envVars.SMTP_HOST,
  SMTP_PORT: envVars.SMTP_PORT,
  EMAIL_USER: envVars.EMAIL_USER,
  EMAIL_PASS: envVars.EMAIL_PASS,
  FRONTEND_URL: envVars.FRONTEND_URL,
  AWS_REGION: envVars.AWS_REGION,
  AWS_ACCESS_KEY_ID: envVars.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: envVars.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME: envVars.S3_BUCKET_NAME,
  S3_SIGNED_URL_EXPIRES: Number(envVars.S3_SIGNED_URL_EXPIRES || 3600),
  TEXTRACT_POLL_INTERVAL_MS: Number(envVars.TEXTRACT_POLL_INTERVAL_MS || 2000),
  TEXTRACT_MAX_POLLS: Number(envVars.TEXTRACT_MAX_POLLS || 120),
};
