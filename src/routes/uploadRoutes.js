const express = require("express");
const {
  uploadSingle,
} = require("../controllers/uploadController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.use(protect);

router.post("/single", upload.single("file"), uploadSingle);

module.exports = router;
