const { BedrockRuntimeClient } = require("@aws-sdk/client-bedrock-runtime");
const envConfig = require("./env.config");

const bedrockClient = new BedrockRuntimeClient({
  region: envConfig.AWS_REGION,
  credentials: {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = { bedrockClient };
