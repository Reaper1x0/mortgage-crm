const { InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { bedrockClient } = require("../../config/bedrock.config");
const llmConfig = require("../../config/llm.config");
const { buildResponse } = require("./llm-provider.interface");

function decodeBody(body) {
  if (!body) return "";
  return Buffer.from(body).toString("utf-8");
}

function extractTextFromBedrockResponse(payload) {
  if (Array.isArray(payload?.content)) {
    return payload.content
      .filter((c) => c?.type === "text" && c?.text)
      .map((c) => c.text)
      .join("\n");
  }

  if (typeof payload?.outputText === "string") return payload.outputText;
  if (typeof payload?.completion === "string") return payload.completion;
  return "{}";
}

async function extractJson({
  systemPrompt,
  userPrompt,
  temperature = llmConfig.bedrock.temperature,
  maxTokens = llmConfig.bedrock.maxTokens,
}) {
  if (!llmConfig.bedrock.modelId) {
    throw new Error("BEDROCK_MODEL_ID is required when LLM provider is bedrock");
  }

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    temperature,
    max_tokens: maxTokens,
  });

  const command = new InvokeModelCommand({
    modelId: llmConfig.bedrock.modelId,
    contentType: "application/json",
    accept: "application/json",
    body,
  });

  const response = await bedrockClient.send(command);
  const decoded = decodeBody(response?.body);
  const parsedPayload = decoded ? JSON.parse(decoded) : {};
  const content = extractTextFromBedrockResponse(parsedPayload) || "{}";

  return buildResponse({
    provider: "bedrock",
    model: llmConfig.bedrock.modelId,
    content,
    usage: parsedPayload?.usage || null,
    raw: parsedPayload,
  });
}

module.exports = { extractJson };
