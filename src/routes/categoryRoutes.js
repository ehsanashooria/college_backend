const express = require('express');
const { body } = require('express-validator');
const {
    getCategories,
    getCategoryById,
    getCategoryBySlug,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryStatistics
} = require('../controllers/categoryController');

const { protect, authorize } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Validation rules
const categoryValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('نام دسته بندی اجباری است')
        .isLength({ max: 50 }).withMessage('نام دسته بندی نمی تواند از 50 کاراکتر بیشتر باشد'),
    body('description')
        .optional()
        .isLength({ max: 200 }).withMessage('توضیحات دسته بندی نمی تواند بیشتر از 200 کاراکتر باشد'),
    body('icon')
        .optional()
        .trim()
];

const updateCategoryValidation = [
    body('name')
        .optional()
        .trim()
        .notEmpty().withMessage('نام دسته بندی اجباری است')
        .isLength({ max: 50 }).withMessage('نام دسته بندی نمی تواند از 50 کاراکتر بیشتر باشد'),
    body('description')
        .optional()
        .isLength({ max: 200 }).withMessage('توضیحات دسته بندی نمی تواند بیشتر از 200 کاراکتر باشد'),
    body('icon')
        .optional()
        .trim(),
    body('isActive')
        .optional()
        .isBoolean().withMessage('وضعیت فعال بودن باید از نوع true/false باشد')
];

// Public routes
// router.get('/:id', getCategoryById);
// router.get('/slug/:slug', getCategoryBySlug);

router.get('/', getCategories);
// Admin only routes
router.post('/', protect, authorize('admin'), categoryValidation, validateRequest, createCategory);
router.put('/:id', protect, authorize('admin'), updateCategoryValidation, validateRequest, updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;