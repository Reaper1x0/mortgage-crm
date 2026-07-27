const mongoose = require("mongoose");
const app = require("../app");
const { envConfig, mongoConfig } = require("../config");
const {
  registerUnexpectedErrorHandlers,
  registerShutdownSignals,
} = require("../bootstrap/lifecycle");
const {
  normalizeSystemRoles,
  ensureDefaultSuperAdmin,
} = require("../seeders/superAdmin.seeder");
const { ensureDefaultStandardPlan } = require("../seeders/plan.seeder");

const SHUTDOWN_TIMEOUT_MS = 10_000;

let server;
let isShuttingDown = false;

async function closeHttpServer() {
  if (!server || !server.listening) return;

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error && error.code !== "ERR_SERVER_NOT_RUNNING") reject(error);
      else resolve();
    });
  });
}

async function shutdown(signalOrReason, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  const forcedExitTimer = setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    console.log(`Shutting down (${signalOrReason})...`);
    await closeHttpServer();
    await mongoose.connection.close(false);
    console.log("Shutdown complete");
    process.exit(exitCode);
  } catch (error) {
    console.error("Shutdown failed:", error);
    process.exit(1);
  } finally {
    clearTimeout(forcedExitTimer);
  }
}

function handleUnexpectedError(error) {
  console.error("Unexpected error:", error);
  shutdown("unexpected_error", 1);
}

function createHttpServer() {
  return new Promise((resolve, reject) => {
    const httpServer = app.listen(envConfig.PORT);

    httpServer.once("listening", () => {
      resolve(httpServer);
    });

    httpServer.once("error", (error) => {
      reject(error);
    });
  });
}

async function startServer() {
  await mongoose.connect(mongoConfig.url, mongoConfig.options);
  await normalizeSystemRoles();
  await ensureDefaultSuperAdmin();
  await ensureDefaultStandardPlan();
  server = await createHttpServer();
  console.log(
    `Server listening on port ${server.address().port} (${envConfig.NODE_ENV})`
  );
}

registerUnexpectedErrorHandlers(handleUnexpectedError);
registerShutdownSignals((signal) => shutdown(signal, 0));

startServer().catch((error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `Startup failed: port ${envConfig.PORT} is already in use. Stop the running process or change PORT.`
    );
  } else {
    console.error("Startup failed:", error);
  }

  if (mongoose.connection.readyState !== 0) {
    mongoose.connection.close(false).finally(() => {
      process.exit(1);
    });
    return;
  }
  process.exit(1);
});
