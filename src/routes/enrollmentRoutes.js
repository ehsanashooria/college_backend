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
  processRefund,
} = require("../controllers/enrollmentController");
const { protect, authorize } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

// Validation
const enrollmentValidation = [
  body("courseId")
    .notEmpty()
    .withMessage("Course ID is required")
    .isMongoId()
    .withMessage("Invalid course ID"),
];

// Public route - payment gateway callback
router.get("/verify", verifyEnrollment);

// Testing route (development only)
router.post("/test-payment/:authority", testPayment);

// Protected routes
router.post(
  "/",
  protect,
  enrollmentValidation,
  validateRequest,
  initiateEnrollment
);
router.get("/mycourses", protect, getMyEnrollments);
router.get("/course/:courseId/check", protect, checkEnrollment);
router.get("/:id", protect, getEnrollmentById);

// Admin routes
router.get("/", protect, authorize("admin"), getAllEnrollments);
router.put("/:id/refund", protect, authorize("admin"), processRefund);

module.exports = router;