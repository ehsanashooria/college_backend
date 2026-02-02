const express = require("express");
const { body } = require("express-validator");
const {
  getLessonById,
  updateLesson,
  deleteLesson,
} = require("../controllers/lessonController");
const { protect } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

const updateLessonValidation = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("عنوان درس اجباری است")
    .isLength({ max: 200 })
    .withMessage("عنوان نمی تواند از 200 کاراکتر بیشتر باشد"),

  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("توضیحات نمی تواند از 1000 کاراکتر بیشتر باشد"),

  body("type")
    .optional()
    .isIn(["video", "article", "quiz", "assignment"])
    .withMessage("نوع درس نامعتبر است"),

  body("videoDuration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("مدت ویدئو باید یک عدد غیر منفی باشد"),

  body("isFree")
    .optional()
    .isBoolean()
    .withMessage("فیلد isFree باید بولین باشد"),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("attachments باید آرایه باشد"),

  body("attachments.*")
    .isObject()
    .withMessage("هر آیتم attachments باید یک object باشد"),
];

router.get("/:id", protect, getLessonById);
router.put(
  "/:id",
  protect,
  updateLessonValidation,
  validateRequest,
  updateLesson
);
router.delete("/:id", protect, deleteLesson);

module.exports = router;
