const mongoose = require("mongoose");
const app = require("../index");
const { envConfig, mongoConfig } = require("../config/");
const { seedMasterFieldsBulk } = require("../seeders/masterFields.seeder");
// ---------------------------------------------------------------------------->>
let server = null;

// src/bin/www.js (top of file)
process.env.PATH =
  "C:\\Program Files\\GraphicsMagick-1.3.46-Q16;" +
  "C:\\Program Files\\gs\\gs10.06.0\\bin;" +
  process.env.PATH;

mongoose
  .connect(mongoConfig.url, mongoConfig.options)
  .then(() => {
    server = app.listen(envConfig.PORT, () => {
      console.log(`Listening to port ${server.address().port}`);
      seedMasterFieldsBulk();
    });
  })
  .catch((err) => {
    console.log("Failed to connect database.\n" + err);
  });
// ---------------------------------------------------------------------------->>
const exitHandler = () => {
  if (server) {
    server.close(() => {
      console.log("Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  console.error(error);
  exitHandler();
};
// ---------------------------------------------------------------------------->>
process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);
