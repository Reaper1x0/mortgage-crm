const { Router } = require("express");
const { userValidation } = require("../validations");
const { userController } = require("../controllers");
const { validate, isAuth, hasRole } = require("../middlewares");

const router = Router();

// All user management routes require Admin role
router.get(
  "/",
  isAuth,
  hasRole(["Admin"]),
  validate(userValidation.listUsers),
  userController.listUsers
);

router.get(
  "/:id",
  isAuth,
  hasRole(["Admin"]),
  validate(userValidation.getUser),
  userController.getUser
);

router.post(
  "/",
  isAuth,
  hasRole(["Admin"]),
  validate(userValidation.createUser),
  userController.createUser
);

router.put(
  "/:id",
  isAuth,
  hasRole(["Admin"]),
  validate(userValidation.updateUser),
  userController.updateUser
);

router.delete(
  "/:id",
  isAuth,
  hasRole(["Admin"]),
  validate(userValidation.deleteUser),
  userController.deleteUser
);

module.exports = router;

