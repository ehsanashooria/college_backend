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
        .isEmail().withMessage('لطفا ایمیل معتبر وارد کنید')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('وارد کردن رمز اجباری است')
];

const updateProfileValidation = [
    body('firstName')
        .optional()
        .trim()
        .notEmpty().withMessage('وارد کردن نام اجباری است')
        .isLength({ max: 50 }).withMessage('نام نباید بیشتر از 50 کاراکتر باشد'),
    body('lastName')
        .optional()
        .trim()
        .notEmpty().withMessage('وارد کردن نام خانوادگی اجباری است')
        .isLength({ max: 50 }).withMessage('نام خانوادگی نباید بیشتر از 50 کاراکتر باشد'),
    body('bio')
        .optional()
        .isLength({ max: 500 }).withMessage('بیوگرافی نباید بیشتر از 500 کاراکتر باشد'),
    body('expertise')
        .optional()
        .isArray().withMessage('نوع فیلد تخصص ها باید از نوع آرایه یا لیست باشد'),
    body('expertise.*')
        .optional()
        .trim()
        .notEmpty().withMessage('تخصص ها نمی توانند متن خالی باشند')
];

const updatePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('فیلد رمز جاری اجباری است'),
    body('newPassword')
        .isLength({ min: 6 }).withMessage('رمز جدید شما باید حداقل 6 کاراکتر باشد')
];

// Public
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);

// Protected
router.get('/me', protect, getMe);
router.put('/updateprofile', protect, updateProfileValidation, validateRequest, updateProfile);
router.put('/updatepassword', protect, updatePasswordValidation, validateRequest, updatePassword);

module.exports = router;