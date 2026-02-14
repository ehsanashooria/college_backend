const express = require('express');
const { body } = require('express-validator');
const {
  getCourseProgress,
  getLessonProgress,
  updateLessonProgress,
  markLessonComplete
} = require('../controllers/progressController');
const { protect } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Validation
const updateProgressValidation = [
  body('watchedDuration')
    .notEmpty().withMessage('مدت زمان مشاهده نباید خالی باشد')
    .isInt({ min: 0 }).withMessage('مدت زمان مشاهده نباید عددی منفی باشد')
];

// All routes require authentication
router.use(protect);

// Routes
router.get('/course/:courseId', getCourseProgress);
router.get('/lesson/:lessonId', getLessonProgress);
router.post('/lesson/:lessonId', updateProgressValidation, validateRequest, updateLessonProgress);
router.put('/lesson/:lessonId/complete', markLessonComplete);

module.exports = router;