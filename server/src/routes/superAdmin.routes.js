const { Router } = require("express");
const { superAdminValidation } = require("../validations");
const { superAdminController } = require("../controllers");
const { validate, isAuth, requireSystemRole } = require("../middlewares");

const router = Router();

router.get(
  "/dashboard",
  isAuth,
  requireSystemRole(["superAdmin"]),
  superAdminController.getDashboard
);

router.get(
  "/users",
  isAuth,
  requireSystemRole(["superAdmin"]),
  validate(superAdminValidation.listSystemUsers),
  superAdminController.listSystemUsers
);

module.exports = router;
