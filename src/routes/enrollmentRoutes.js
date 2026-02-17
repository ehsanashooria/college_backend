const express = require("express");
const { body } = require("express-validator");
const {
  initiateEnrollment,
  verifyEnrollment,
  testPayment,
  getMyEnrollments,
  getEnrollmentById,
  checkEnrollment,
  getAllEnrollments,
} = require("../controllers/enrollmentController");

const { protect, authorize } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

// Validation
const enrollmentValidation = [
  body("courseId")
    .notEmpty()
    .withMessage("شناسه دوره اجباری است")
    .isMongoId()
    .withMessage("شناسه دوره معتبر نیست"),
];

// Protected routes
router.post(
  "/",
  protect,
  enrollmentValidation,
  validateRequest,
  initiateEnrollment,
);

// Testing route (development only)
router.post("/test-payment/:authority", testPayment);

// Public route - payment gateway callback
router.get("/verify", verifyEnrollment);

router.get("/mycourses", protect, getMyEnrollments);
router.get("/course/:courseId/check", protect, checkEnrollment);
router.get("/:id", protect, getEnrollmentById);

// Admin routes
router.get("/", protect, authorize("admin"), getAllEnrollments);

module.exports = router;
