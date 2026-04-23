const envConfig = require("./env.config");

const SUPPORTED_PROVIDERS = ["openai", "bedrock"];

function normalizeProvider(value, fallback) {
  const provider = String(value || fallback || "").trim().toLowerCase();
  return SUPPORTED_PROVIDERS.includes(provider) ? provider : fallback;
}

const primaryProvider = normalizeProvider(envConfig.LLM_PROVIDER, "openai");
const fallbackProvider = normalizeProvider(
  envConfig.LLM_FALLBACK_PROVIDER,
  null
);

module.exports = {
  SUPPORTED_PROVIDERS,
  primaryProvider,
  fallbackProvider:
    fallbackProvider && fallbackProvider !== primaryProvider
      ? fallbackProvider
      : null,
  timeoutMs: Number(envConfig.LLM_TIMEOUT_MS || 60000),
  maxRetries: Number(envConfig.LLM_MAX_RETRIES || 2),
  openai: {
    model: envConfig.OPENAI_MODEL || envConfig.GPT_MODEL || "gpt-4o-mini",
    maxTokens: Number(envConfig.OPENAI_MAX_TOKENS || 4096),
    temperature: Number(envConfig.OPENAI_TEMPERATURE || 0),
    timeoutMs: Number(envConfig.OPENAI_TIMEOUT_MS || envConfig.LLM_TIMEOUT_MS || 60000),
    maxRetries: Number(envConfig.OPENAI_MAX_RETRIES || envConfig.LLM_MAX_RETRIES || 2),
  },
  bedrock: {
    modelId: envConfig.BEDROCK_MODEL_ID || "",
    maxTokens: Number(envConfig.BEDROCK_MAX_TOKENS || 4096),
    temperature: Number(envConfig.BEDROCK_TEMPERATURE || 0),
    timeoutMs: Number(envConfig.BEDROCK_TIMEOUT_MS || envConfig.LLM_TIMEOUT_MS || 60000),
    maxRetries: Number(envConfig.BEDROCK_MAX_RETRIES || envConfig.LLM_MAX_RETRIES || 2),
  },
};
