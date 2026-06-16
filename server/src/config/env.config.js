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
  LLM_PROVIDER: Joi.string()
    .valid("openai", "bedrock")
    .default("openai")
    .label("LLM_PROVIDER"),
  LLM_FALLBACK_PROVIDER: Joi.string()
    .valid("openai", "bedrock")
    .optional()
    .allow("")
    .label("LLM_FALLBACK_PROVIDER"),
  LLM_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .default(60000)
    .label("LLM_TIMEOUT_MS"),
  LLM_MAX_RETRIES: Joi.number()
    .integer()
    .min(0)
    .default(2)
    .label("LLM_MAX_RETRIES"),
  OPENAI_API_KEY: Joi.string().allow("").optional().label("OPENAI_API_KEY"),
  OPENAI_MODEL: Joi.string().allow("").optional().label("OPENAI_MODEL"),
  OPENAI_MAX_TOKENS: Joi.number().integer().min(1).optional().label("OPENAI_MAX_TOKENS"),
  OPENAI_TEMPERATURE: Joi.number().min(0).max(2).optional().label("OPENAI_TEMPERATURE"),
  OPENAI_TIMEOUT_MS: Joi.number().integer().min(1000).optional().label("OPENAI_TIMEOUT_MS"),
  OPENAI_MAX_RETRIES: Joi.number().integer().min(0).optional().label("OPENAI_MAX_RETRIES"),
  OPENAI_EMBEDDING_MODEL: Joi.string()
    .allow("")
    .optional()
    .default("text-embedding-3-small")
    .label("OPENAI_EMBEDDING_MODEL"),
  OPENAI_ASSISTANT_MODEL: Joi.string().allow("").optional().label("OPENAI_ASSISTANT_MODEL"),
  RAG_CHUNK_SIZE: Joi.number().integer().min(200).optional().default(1000).label("RAG_CHUNK_SIZE"),
  RAG_CHUNK_OVERLAP: Joi.number().integer().min(0).optional().default(150).label("RAG_CHUNK_OVERLAP"),
  RAG_TOP_K: Joi.number().integer().min(1).max(50).optional().default(8).label("RAG_TOP_K"),
  RAG_MIN_SIMILARITY: Joi.number().min(0).max(1).optional().default(0.2).label("RAG_MIN_SIMILARITY"),
  RAG_EMBED_BATCH_SIZE: Joi.number().integer().min(1).max(100).optional().default(50).label("RAG_EMBED_BATCH_SIZE"),
  RAG_VECTOR_INDEX_NAME: Joi.string()
    .allow("")
    .optional()
    .default("document_chunks_vector_index")
    .label("RAG_VECTOR_INDEX_NAME"),
  BEDROCK_MODEL_ID: Joi.string().allow("").optional().label("BEDROCK_MODEL_ID"),
  BEDROCK_MAX_TOKENS: Joi.number().integer().min(1).optional().label("BEDROCK_MAX_TOKENS"),
  BEDROCK_TEMPERATURE: Joi.number().min(0).max(2).optional().label("BEDROCK_TEMPERATURE"),
  BEDROCK_TIMEOUT_MS: Joi.number().integer().min(1000).optional().label("BEDROCK_TIMEOUT_MS"),
  BEDROCK_MAX_RETRIES: Joi.number().integer().min(0).optional().label("BEDROCK_MAX_RETRIES"),
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
  STRIPE_SECRET_KEY: Joi.string().allow("").optional().label("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow("").optional().label("STRIPE_WEBHOOK_SECRET"),
  STRIPE_SUCCESS_URL: Joi.string().allow("").optional().label("STRIPE_SUCCESS_URL"),
  STRIPE_CANCEL_URL: Joi.string().allow("").optional().label("STRIPE_CANCEL_URL"),
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
  OPENAI_MODEL: envVars.OPENAI_MODEL,
  OPENAI_MAX_TOKENS: envVars.OPENAI_MAX_TOKENS,
  OPENAI_TEMPERATURE: envVars.OPENAI_TEMPERATURE,
  OPENAI_TIMEOUT_MS: envVars.OPENAI_TIMEOUT_MS,
  OPENAI_MAX_RETRIES: envVars.OPENAI_MAX_RETRIES,
  OPENAI_EMBEDDING_MODEL: envVars.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  OPENAI_ASSISTANT_MODEL: envVars.OPENAI_ASSISTANT_MODEL || "",
  RAG_CHUNK_SIZE: Number(envVars.RAG_CHUNK_SIZE || 1000),
  RAG_CHUNK_OVERLAP: Number(envVars.RAG_CHUNK_OVERLAP || 150),
  RAG_TOP_K: Number(envVars.RAG_TOP_K || 8),
  RAG_MIN_SIMILARITY: Number(envVars.RAG_MIN_SIMILARITY || 0.2),
  RAG_EMBED_BATCH_SIZE: Number(envVars.RAG_EMBED_BATCH_SIZE || 50),
  RAG_VECTOR_INDEX_NAME: envVars.RAG_VECTOR_INDEX_NAME || "document_chunks_vector_index",
  BEDROCK_MODEL_ID: envVars.BEDROCK_MODEL_ID,
  BEDROCK_MAX_TOKENS: envVars.BEDROCK_MAX_TOKENS,
  BEDROCK_TEMPERATURE: envVars.BEDROCK_TEMPERATURE,
  BEDROCK_TIMEOUT_MS: envVars.BEDROCK_TIMEOUT_MS,
  BEDROCK_MAX_RETRIES: envVars.BEDROCK_MAX_RETRIES,
  LLM_PROVIDER: envVars.LLM_PROVIDER,
  LLM_FALLBACK_PROVIDER: envVars.LLM_FALLBACK_PROVIDER || null,
  LLM_TIMEOUT_MS: Number(envVars.LLM_TIMEOUT_MS || 60000),
  LLM_MAX_RETRIES: Number(envVars.LLM_MAX_RETRIES || 2),
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
  STRIPE_SECRET_KEY: envVars.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: envVars.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_SUCCESS_URL: envVars.STRIPE_SUCCESS_URL || "",
  STRIPE_CANCEL_URL: envVars.STRIPE_CANCEL_URL || "",
};
