const express = require('express');
const { body } = require('express-validator');
const {
  getSectionById,
  updateSection,
  deleteSection
} = require('../controllers/sectionController');
const { protect } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

const updateSectionValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('عنوان نمی تواند خالی باشد')
    .isLength({ max: 200 }).withMessage('عنوان نمی تواند بیشتر از 200 کاراکتر باشد'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('توضیحات نمی تواند بیشتر از 500 کاراکتر باشد')
];

router.get('/:id', protect, getSectionById);
router.put('/:id', protect, updateSectionValidation, validateRequest, updateSection);
router.delete('/:id', protect, deleteSection);

module.exports = router;