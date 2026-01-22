const modifyPrompt = (prompt, type, categories = []) =>
  prompt +
  ` Generate the application using ${type} and the design style of the app should be ${categories.join(
    ", "
  )}`;

module.exports = { modifyPrompt };
