const llmService = require("../services/llm/llm.service");

const queryGPT = async (messages) => {
  const systemPrompt = Array.isArray(messages)
    ? messages
        .filter((m) => m?.role === "system")
        .map((m) => m.content)
        .join("\n")
    : "";
  const userPrompt = Array.isArray(messages)
    ? messages
        .filter((m) => m?.role !== "system")
        .map((m) => m.content)
        .join("\n")
    : "";

  const result = await llmService.extractJson({
    systemPrompt: systemPrompt || "Return strict JSON output only.",
    userPrompt,
  });
  return result.parsed;
};

module.exports = queryGPT;
