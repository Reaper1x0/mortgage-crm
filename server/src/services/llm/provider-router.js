const llmConfig = require("../../config/llm.config");
const { getProvider, hasProvider } = require("./provider-registry");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProviderOrder() {
  const order = [llmConfig.primaryProvider];
  if (llmConfig.fallbackProvider && llmConfig.fallbackProvider !== llmConfig.primaryProvider) {
    order.push(llmConfig.fallbackProvider);
  }
  return order.filter((name) => hasProvider(name));
}

async function executeWithProviderFallback(params) {
  const providerOrder = getProviderOrder();
  if (!providerOrder.length) {
    throw new Error("No configured LLM providers are available");
  }

  const errors = [];
  for (const providerName of providerOrder) {
    const provider = getProvider(providerName);
    if (!provider || typeof provider.extractJson !== "function") continue;

    const retryCount = Math.max(0, Number(llmConfig.maxRetries || 0));
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        return await provider.extractJson(params);
      } catch (error) {
        const isLastAttempt = attempt >= retryCount;
        if (isLastAttempt) {
          errors.push({
            provider: providerName,
            message: error?.message || String(error),
          });
          break;
        }
        // exponential-ish backoff: 250ms, 500ms, 1000ms...
        await sleep(250 * Math.pow(2, attempt));
      }
    }
  }

  const failureSummary = errors
    .map((e) => `${e.provider}: ${e.message}`)
    .join(" | ");
  throw new Error(`All configured LLM providers failed. ${failureSummary}`);
}

module.exports = {
  executeWithProviderFallback,
};
