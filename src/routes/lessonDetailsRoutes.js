const express = require('express');
const { body } = require('express-validator');
const {
  getLessonById,
  updateLesson,
  deleteLesson
} = require('../controllers/lessonController');
const { protect } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

const updateLessonValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('type')
    .optional()
    .isIn(['video', 'article', 'quiz', 'assignment']).withMessage('Invalid lesson type'),
  body('videoDuration')
    .optional()
    .isInt({ min: 0 }).withMessage('Video duration must be a non-negative integer')
];

router.get('/:id', protect, getLessonById);
router.put('/:id', protect, updateLessonValidation, validateRequest, updateLesson);
router.delete('/:id', protect, deleteLesson);

module.exports = router;