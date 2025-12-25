const express = require('express');
const { body } = require('express-validator');
const {
  getSectionLessons,
  createLesson,
  reorderLessons
} = require('../controllers/lessonController');
const { protect } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router({ mergeParams: true });

// Validation
const lessonValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Lesson title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('type')
    .optional()
    .isIn(['video', 'article', 'quiz', 'assignment']).withMessage('Invalid lesson type'),
  body('videoDuration')
    .optional()
    .isInt({ min: 0 }).withMessage('Video duration must be a non-negative integer'),
  body('isFree')
    .optional()
    .isBoolean().withMessage('isFree must be a boolean')
];

router.get('/', protect, getSectionLessons);
router.post('/', protect, lessonValidation, validateRequest, createLesson);
router.put('/reorder', protect, reorderLessons);

module.exports = router;