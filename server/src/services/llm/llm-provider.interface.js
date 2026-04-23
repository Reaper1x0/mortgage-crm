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

function buildResponse({ provider, model, content, usage = null, raw = null }) {
  return {
    provider,
    model: model || null,
    content,
    parsed: parseJsonPayload(content),
    usage,
    raw,
  };
}

module.exports = {
  buildResponse,
};
