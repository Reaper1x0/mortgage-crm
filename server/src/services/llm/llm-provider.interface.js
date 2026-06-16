function parseJsonPayload(content) {
  if (typeof content !== "string") {
    throw new Error("LLM response content is not a string");
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`LLM returned invalid JSON: ${error.message}`);
  }
}

function buildResponse({ provider, model, content, usage = null, raw = null, parseJson = true }) {
  const result = {
    provider,
    model: model || null,
    content,
    usage,
    raw,
  };
  if (parseJson) {
    result.parsed = parseJsonPayload(content);
  }
  return result;
}

module.exports = {
  buildResponse,
};
