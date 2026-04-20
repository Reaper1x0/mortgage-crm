function registerUnexpectedErrorHandlers(onError) {
  process.on("uncaughtException", onError);
  process.on("unhandledRejection", onError);
}

function registerShutdownSignals(onShutdown) {
  process.on("SIGTERM", () => onShutdown("SIGTERM"));
  process.on("SIGINT", () => onShutdown("SIGINT"));
}

module.exports = {
  registerUnexpectedErrorHandlers,
  registerShutdownSignals,
};
