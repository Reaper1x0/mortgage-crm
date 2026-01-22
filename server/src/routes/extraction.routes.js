// backend/routes/extractionRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  handleCnicUpload,
  handleDocumentsUpload,
} = require("../controllers/extraction.controller");
const isAuth = require("../middlewares/auth.middleware");
const hasRole = require("../middlewares/hasRole.middleware");

const router = express.Router();

// Multer config (memory + disk path)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// CNIC – single file
router.post(
  "/cnic/extract-name/:id",
  isAuth,
  hasRole(["Admin"]),
  upload.single("cnic"),
  handleCnicUpload
);

// Documents – multiple
router.post(
  "/documents/extract-fields/:id",
  isAuth,
  hasRole(["Admin"]),
  upload.array("documents", 10),
  handleDocumentsUpload
);

module.exports = router;
