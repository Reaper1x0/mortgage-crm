const { Router } = require("express");
const { userValidation } = require("../validations");
const { userController } = require("../controllers");
const {
  validate,
  isAuth,
  requireWorkspace,
  requirePermission,
  requireActiveSubscription,
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

router.post(
  "/",
  isAuth,
  requireWorkspace,
  requireActiveSubscription,
  requirePermission(["workspace.users.manage", "organization.members.invite", "organization.members.update"], {
    scope: "either",
    mode: "any",
  }),
  validate(userValidation.createUser),
  userController.createUser
);

router.put(
  "/:id",
  isAuth,
  requireWorkspace,
  requirePermission(["workspace.users.manage", "organization.members.update"], {
    scope: "either",
    mode: "any",
  }),
  validate(userValidation.updateUser),
  userController.updateUser
);

router.delete(
  "/:id",
  isAuth,
  requireWorkspace,
  requirePermission(["workspace.users.manage", "organization.members.update", "organization.members.remove"], {
    scope: "either",
    mode: "any",
  }),
  validate(userValidation.deleteUser),
  userController.deleteUser
);

module.exports = router;
