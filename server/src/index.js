const cors = require("cors");
const morgan = require("morgan");
const express = require("express");
const routes = require("./routes");
const { R5XX } = require("./Responses");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(cors());
app.set("trust proxy", true);
//Logs all the requests with repective response' status.
app.use(morgan("tiny"));
//Endpoints routing
app.use("/backend/api", routes);
app.use(express.static(__dirname + "/public"));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


//Error catching middleware
app.use((error, req, res, next) => {
  console.log(error);
  R5XX(res, { error: error?.message });
});

module.exports = app;
