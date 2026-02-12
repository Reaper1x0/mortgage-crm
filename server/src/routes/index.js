const { Router } = require("express");

const router = Router();
const authRoutes = require("./auth.routes");
const extractionRoutes = require("./extraction.routes");
const masterFieldRoutes = require("./masterFields.routes");
const submissionRoutes = require("./submission.routes");
const templateRoutes = require("./template.routes");
const userRoutes = require("./user.routes");
const dashboardRoutes = require("./dashboard.routes");
const auditTrailRoutes = require("./auditTrail.routes");

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
  },
  {
    path: "/templates",
    route: templateRoutes,
  },
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/dashboard",
    route: dashboardRoutes,
  },
  {
    path: "/audit-trail",
    route: auditTrailRoutes,
  },
];

defaultRoutes.forEach(({ path, route }) => {
  router.use(path, route);
});

module.exports = router;
