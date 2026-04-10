const { Router } = require("express");
const { validate, isAuth } = require("../middlewares");
const { workspaceValidation } = require("../validations");
const WorkspaceController = require("../controllers/workspace.controller");

const router = Router();

router.get("/", isAuth, WorkspaceController.listMine);

router.post(
  "/",
  isAuth,
  validate(workspaceValidation.createWorkspace),
  WorkspaceController.create
);

module.exports = router;
