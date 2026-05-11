const { Router } = require("express");
const { userValidation } = require("../validations");
const { userController } = require("../controllers");
const {
  validate,
  isAuth,
  requireWorkspace,
  hasRole,
  requireActiveSubscription,
  requireWorkspaceUserManager,
} = require("../middlewares");

const router = Router();

router.get(
  "/",
  isAuth,
  requireWorkspace,
  hasRole(["Admin", "Agent", "Viewer"]),
  validate(userValidation.listUsers),
  userController.listUsers
);

router.get(
  "/:id",
  isAuth,
  requireWorkspace,
  hasRole(["Admin", "Agent", "Viewer"]),
  validate(userValidation.getUser),
  userController.getUser
);

router.post(
  "/",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  requireWorkspaceUserManager,
  validate(userValidation.createUser),
  userController.createUser
);

router.put(
  "/:id",
  isAuth,
  requireWorkspace,
  requireWorkspaceUserManager,
  validate(userValidation.updateUser),
  userController.updateUser
);

router.delete(
  "/:id",
  isAuth,
  requireWorkspace,
  requireWorkspaceUserManager,
  validate(userValidation.deleteUser),
  userController.deleteUser
);

module.exports = router;

