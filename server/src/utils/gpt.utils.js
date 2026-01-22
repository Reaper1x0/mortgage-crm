const { openai, envConfig } = require("../config");

const queryGPT = async (messages) => {
  const GPTOutput = await openai.chat.completions.create({
    model: envConfig.GPT_MODEL,
    messages,
  });
  return JSON.parse(GPTOutput.choices[0].message.content);
};

module.exports = queryGPT;
