const openaiAdapter = require("./openai.adapter");
const bedrockAdapter = require("./bedrock.adapter");

const providers = new Map([
  ["openai", openaiAdapter],
  ["bedrock", bedrockAdapter],
]);

function getProvider(providerName) {
  return providers.get(String(providerName || "").toLowerCase()) || null;
}

function hasProvider(providerName) {
  return providers.has(String(providerName || "").toLowerCase());
}

module.exports = {
  getProvider,
  hasProvider,
};
