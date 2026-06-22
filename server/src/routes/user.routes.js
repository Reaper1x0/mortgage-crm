const { Router } = require("express");
const { userValidation } = require("../validations");
const { userController } = require("../controllers");
const {
  validate,
  isAuth,
  requireWorkspace,
  requirePermission,
} = require("../middlewares");

const router = Router();

router.get(
  "/",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.users.read"),
  validate(userValidation.listUsers),
  userController.listUsers
);

router.get(
  "/:id",
  isAuth,
  requireWorkspace,
  requirePermission("workspace.users.read"),
  validate(userValidation.getUser),
  userController.getUser
);

module.exports = router;
