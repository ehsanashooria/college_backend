const express = require("express");
const { body } = require("express-validator");
const {
  getQuestionAnswers,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  acceptAnswer,
} = require("../controllers/answerController");
const { protect } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

// Validation
const answerValidation = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("محتوای پاسخ نمی تواند خالی باشد")
    .isLength({ max: 2000 })
    .withMessage("پاسخ نمی تواند بیشتر از 2000 کاراکتر باشد"),
];

// All routes require authentication
router.use(protect);

// Answer routes
router.get("/question/:questionId", getQuestionAnswers);
router.post(
  "/question/:questionId",
  answerValidation,
  validateRequest,
  createAnswer,
);
router.put("/:id", answerValidation, validateRequest, updateAnswer);
router.delete("/:id", deleteAnswer);
router.put("/:id/accept", acceptAnswer);

module.exports = router;
