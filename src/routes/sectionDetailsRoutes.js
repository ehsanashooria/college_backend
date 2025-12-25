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
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
];

router.get('/:id', protect, getSectionById);
router.put('/:id', protect, updateSectionValidation, validateRequest, updateSection);
router.delete('/:id', protect, deleteSection);

module.exports = router;