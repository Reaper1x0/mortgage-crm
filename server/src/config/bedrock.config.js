const { BedrockRuntimeClient } = require("@aws-sdk/client-bedrock-runtime");
const envConfig = require("./env.config");

const awsClientConfig = {
  region: envConfig.AWS_REGION,
};

if (envConfig.AWS_ACCESS_KEY_ID && envConfig.AWS_SECRET_ACCESS_KEY) {
  awsClientConfig.credentials = {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
  };
}

const bedrockClient = new BedrockRuntimeClient(awsClientConfig);

module.exports = { bedrockClient };
