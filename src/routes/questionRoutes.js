const express = require("express");
const { body } = require("express-validator");
const {
  getLessonQuestions,
  getCourseQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} = require("../controllers/questionController");
const { protect } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

// Validation
const questionValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("عنوان سوال الزامی است")
    .isLength({ max: 200 })
    .withMessage("عنوان سوال نمی تواند بیشتر از 200 کاراکتر باشد"),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("محتوای سوال الزامی است")
    .isLength({ max: 2000 })
    .withMessage("محتوای سوال نمی تواند بیشتر از 2000 کاراکتر باشد"),
];

// All routes require authentication
router.use(protect);

// Question routes
router.get("/lesson/:lessonId", getLessonQuestions);
router.get("/:id", getQuestionById);
router.post(
  "/lesson/:lessonId",
  questionValidation,
  validateRequest,
  createQuestion,
);
router.put("/:id", questionValidation, validateRequest, updateQuestion);
router.delete("/:id", deleteQuestion);

module.exports = router;
