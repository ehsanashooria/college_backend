const express = require('express');
const { body } = require('express-validator');
const {
    getCourses,
    getCourseById,
    getCourseBySlug,
    createCourse,
    updateCourse,
    deleteCourse,
    changeCourseStatus,
    getInstructorCourses,
    getCourseStudents,
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Validation rules
const createCourseValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('فیلد عنوان دوره اجباری است')
        .isLength({ max: 200 }).withMessage('عنوان نمی‌تواند بیش از ۲۰۰ کاراکتر باشد'),
    body('description')
        .trim()
        .notEmpty().withMessage('فیلد توضیحات دوره اجباری است')
        .isLength({ max: 2000 }).withMessage('توضیحات نمی‌تواند بیش از ۲۰۰۰ کاراکتر باشد'),
    body('shortDescription')
        .optional()
        .notEmpty().withMessage('فیلد توضیحات کوتاه اجباری است')
        .isLength({ max: 300 }).withMessage('توضیحات کوتاه نمی‌تواند بیش از ۳۰۰ کاراکتر باشد'),
    body('category')
        .notEmpty().withMessage('فیلد دسته‌بندی اجباری است')
        .isArray({ min: 1 }).withMessage('دسته‌بندی باید آرایه‌ای از شناسه‌ها باشد'),
    body('category.*')
        .isMongoId().withMessage('یکی از شناسه‌های دسته‌بندی نامعتبر است'),
    body('level')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced', 'all-levels']).withMessage('سطح نامعتبر است'),
    body('price')
        .notEmpty().withMessage('فیلد قیمت اجباری است')
        .isFloat({ min: 0 }).withMessage('قیمت باید ۰ یا بزرگتر باشد'),
    body('discountPrice')
        .optional()
        .isFloat({ min: 0 }).withMessage('قیمت با تخفیف باید ۰ یا بزرگتر باشد'),
    body('tags')
        .optional()
        .isArray().withMessage('برچسب ها باید لیست یا آرایه باشند'),
    body('whatYouWillLearn')
        .optional()
        .isArray().withMessage('فیلد ""چه چیزهایی یاد خواهید گرفت"" باید لیست یا آرایه باشد')
];

const updateCourseValidation = [
    body('title')
        .optional()
        .trim()
        .notEmpty().withMessage('عنوان دوره نمی‌تواند خالی باشد')
        .isLength({ max: 200 }).withMessage('عنوان دوره نمی‌تواند بیشتر از ۲۰۰ کاراکتر باشد'),
    body('description')
        .optional()
        .trim()
        .notEmpty().withMessage('توضیحات دوره نمی‌تواند خالی باشد')
        .isLength({ max: 2000 }).withMessage('توضیحات دوره نمی‌تواند بیشتر از ۲۰۰۰ کاراکتر باشد'),
    body('shortDescription')
        .optional()
        .isLength({ max: 300 }).withMessage('توضیح کوتاه نمی‌تواند بیشتر از ۳۰۰ کاراکتر باشد'),
    body('category')
        .optional()
        .notEmpty().withMessage('فیلد دسته‌بندی اجباری است')
        .isArray({ min: 1 }).withMessage('دسته‌بندی باید آرایه‌ای از شناسه‌ها باشد'),
    body('category.*')
        .optional()
        .isMongoId().withMessage('یکی از شناسه‌های دسته‌بندی نامعتبر است'),
    body('level')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced', 'all-levels'])
        .withMessage('سطح دوره معتبر نیست'),
    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('قیمت دوره باید عددی بزرگ‌تر یا مساوی صفر باشد'),
    body('discountPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('قیمت با تخفیف باید عددی بزرگ‌تر یا مساوی صفر باشد')
];


// Public routes
router.get('/', getCourses);
router.get('/:id', getCourseById);
router.get('/slug/:slug', getCourseBySlug);

// Instructor routes (must be before /:id routes to avoid conflict)
router.get('/instructor/mycourses', protect, authorize('instructor'), getInstructorCourses);

// Protected routes - Create course
router.post('/', protect, authorize('instructor', 'admin'), createCourseValidation, validateRequest, createCourse);

// Protected routes - Manage courses
router.put('/:id', protect, authorize('instructor', 'admin'), updateCourseValidation, validateRequest, updateCourse);
router.delete('/:id', protect, authorize('instructor', 'admin'), deleteCourse);
router.put('/:id/changeStatus', protect, authorize('instructor', 'admin'), changeCourseStatus);
router.get('/:id/students', protect, authorize('instructor', 'admin'), getCourseStudents);

module.exports = router;