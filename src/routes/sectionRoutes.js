const express = require('express');
const { body } = require('express-validator');
const {
  getCourseSections,
  createSection,
  reorderSections
} = require('../controllers/sectionController');

const { protect } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router({ mergeParams: true }); // Important for nested routes (accessing courseId)

// Validation
const sectionValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('عنوان بخش اجباری است')
    .isLength({ max: 200 }).withMessage('عنوان نمی‌تواند بیشتر از 200 کاراکتر باشد'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('توضیحات نمی‌تواند بیشتر از 500 کاراکتر باشد'),
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('فیلد ترتیب باید یک عدد صحیح غیر منفی باشد')
];

// Routes
router.get('/', protect, getCourseSections);
router.post('/', protect, sectionValidation, validateRequest, createSection);
router.put('/reorder', protect, reorderSections);

module.exports = router;