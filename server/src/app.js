const cors = require("cors");
const morgan = require("morgan");
const express = require("express");
const routes = require("./routes");
const { R5XX, R4XX } = require("./Responses");
const { envConfig } = require("./config");

const app = express();
const normalizeOrigin = (value = "") =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");

const allowedOrigins = envConfig.FRONTEND_URL.split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

app.set("view engine", "ejs");
app.set("trust proxy", true);

app.use(
  express.json({
    limit: "2mb",
    verify(req, _res, buf) {
      if (req.originalUrl.includes("/billing/webhook/stripe")) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = normalizeOrigin(origin);
      if (!origin || allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy blocked this origin"));
    },
    credentials: true,
  })
);
app.use(morgan(envConfig.NODE_ENV === "production" ? "combined" : "tiny"));

app.get("/healthz", (req, res) => {
  const payload = {
    success: true,
    status: "ok",
    uptime: process.uptime(),
  };

  if (envConfig.NODE_ENV !== "production") {
    payload.env = envConfig.NODE_ENV;
  }

  res.status(200).json(payload);
});

app.use("/backend/api", routes);
app.use(express.static(`${__dirname}/public`));

app.use((req, res) => {
  R4XX(res, 404, "Route not found");
});

app.use((error, req, res, next) => {
  if (envConfig.NODE_ENV !== "production") {
    console.error(error);
  }

  R5XX(res, {
    error:
      envConfig.NODE_ENV === "production"
        ? undefined
        : error?.message || "Unknown error",
  });
});

module.exports = app;
