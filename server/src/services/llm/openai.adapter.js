const { openai } = require("../../config");
const llmConfig = require("../../config/llm.config");
const { buildResponse } = require("./llm-provider.interface");

async function extractJson({
  systemPrompt,
  userPrompt,
  temperature = llmConfig.openai.temperature,
  maxTokens = llmConfig.openai.maxTokens,
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  if (!openai) {
    throw new Error("OpenAI client is not configured");
  }

  const completion = await openai.chat.completions.create({
    model: llmConfig.openai.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature,
    max_tokens: maxTokens,
  });

  const content = completion?.choices?.[0]?.message?.content || "{}";
  return buildResponse({
    provider: "openai",
    model: completion?.model || llmConfig.openai.model,
    content,
    usage: completion?.usage || null,
    raw: completion,
  });
}

async function createEmbeddings({ input }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  if (!openai) {
    throw new Error("OpenAI client is not configured");
  }

  const texts = Array.isArray(input) ? input : [input];
  if (!texts.length) return [];

  const response = await openai.embeddings.create({
    model: llmConfig.openai.embeddingModel,
    input: texts,
  });

  const sorted = (response?.data || []).sort((a, b) => a.index - b.index);
  return sorted.map((item) => item.embedding);
}

async function createChatCompletion({
  messages,
  temperature = llmConfig.openai.temperature,
  maxTokens = llmConfig.openai.maxTokens,
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  if (!openai) {
    throw new Error("OpenAI client is not configured");
  }
  if (!Array.isArray(messages) || !messages.length) {
    throw new Error("createChatCompletion requires messages");
  }

  const completion = await openai.chat.completions.create({
    model: llmConfig.openai.assistantModel,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  const content = completion?.choices?.[0]?.message?.content || "";
  return buildResponse({
    provider: "openai",
    model: completion?.model || llmConfig.openai.assistantModel,
    content,
    usage: completion?.usage || null,
    raw: completion,
    parseJson: false,
  });
}

module.exports = { extractJson, createEmbeddings, createChatCompletion };
