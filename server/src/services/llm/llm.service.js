const { executeWithProviderFallback } = require("./provider-router");
const llmConfig = require("../../config/llm.config");

function withTimeout(promise, timeoutMs) {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`LLM request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

async function extractJson({
  systemPrompt,
  userPrompt,
  temperature,
  maxTokens,
}) {
  if (!systemPrompt || !userPrompt) {
    throw new Error("extractJson requires both systemPrompt and userPrompt");
  }

  const startedAt = Date.now();
  const result = await withTimeout(
    executeWithProviderFallback({
      systemPrompt,
      userPrompt,
      temperature,
      maxTokens,
    }),
    Number(llmConfig.timeoutMs || 60000)
  );
  const durationMs = Date.now() - startedAt;

  console.log("[LLM] provider:", result.provider);
  console.log("[LLM] model:", result.model);
  console.log("[LLM] duration_ms:", durationMs);

  return result;
}

module.exports = {
  extractJson,
};
