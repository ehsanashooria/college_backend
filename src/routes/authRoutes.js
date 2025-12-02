const express = require('express');
const { body } = require('express-validator');
const {
    register,
    login,
    getMe,
    updateProfile,
    updatePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Validation rules
const registerValidation = [
    body('firstName')
        .trim()
        .notEmpty().withMessage('وارد کردن نام اجباری است')
        .isLength({ max: 50 }).withMessage('نام باید حداکثر 50 کاراکتر باشد'),
    body('lastName')
        .trim()
        .notEmpty().withMessage('وارد کردن نام خانوادگی اجباری است')
        .isLength({ max: 50 }).withMessage('نام خانوادگی نمی تواند بیشتری از 50 کاراکتر باشد'),
    body('email')
        .isEmail().withMessage('لطفا ایمیل معتبر وارد کنید')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 }).withMessage('رمز شما باید حداقل 6 کاراکتر باشد'),
    body('role')
        .optional()
        .isIn(['student', 'instructor']).withMessage('نقش کاربر مورد تایید نیست')
];

const loginValidation = [
    body('email')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
];

const updateProfileValidation = [
    body('firstName')
        .optional()
        .trim()
        .notEmpty().withMessage('First name cannot be empty')
        .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
    body('lastName')
        .optional()
        .trim()
        .notEmpty().withMessage('Last name cannot be empty')
        .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
    body('bio')
        .optional()
        .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
    body('expertise')
        .optional()
        .isArray().withMessage('Expertise must be an array'),
    body('expertise.*')
        .optional()
        .trim()
        .notEmpty().withMessage('Expertise item cannot be empty')
];

const updatePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Public
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);

// Protected
router.get('/me', protect, getMe);
router.put('/updateprofile', protect, updateProfileValidation, validateRequest, updateProfile);
router.put('/updatepassword', protect, updatePasswordValidation, validateRequest, updatePassword);

module.exports = router;
