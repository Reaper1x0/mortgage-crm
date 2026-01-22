const { Router } = require("express");

const router = Router();
const authRoutes = require("./auth.routes");
const extractionRoutes = require("./extraction.routes");
const masterFieldRoutes = require("./masterFields.routes");
const submissionRoutes = require("./submission.routes");
const templateRoutes = require("./template.routes");

const defaultRoutes = [
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/extraction",
    route: extractionRoutes,
  },
  {
    path: "/master-fields",
    route: masterFieldRoutes,
  },
  {
    path: "/submissions",
    route: submissionRoutes,
  }
  ,
  {
    path: "/templates",
    route: templateRoutes,
  }
];

defaultRoutes.forEach(({ path, route }) => {
  router.use(path, route);
});

module.exports = router;
