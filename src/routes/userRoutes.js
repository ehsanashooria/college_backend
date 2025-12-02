const express = require('express');
const { body } = require('express-validator');
const {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    toggleUserStatus
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Validation for updating user
const updateUserValidation = [
    body('firstName')
        .optional()
        .trim()
        .notEmpty().withMessage('نام نمی تواند خالی باشد')
        .isLength({ max: 50 }).withMessage('نام نباید بیشتر از 50 کاراکتر باشد'),
    body('lastName')
        .optional()
        .trim()
        .notEmpty().withMessage('نام خانوادگی نمی تواند خالی باشد')
        .isLength({ max: 50 }).withMessage('نام خانوادگی نباید بیشتر از 50 کاراکتر باشد'),
    body('email')
        .optional()
        .isEmail().withMessage('لطفا یک ایمیل معتبر وارد کنید')
        .normalizeEmail(),
    body('role')
        .optional()
        .isIn(['student', 'instructor']).withMessage('نقش کاربر نامعتبر است'),
    body('isEmailVerified')
        .optional()
        .isBoolean().withMessage('وضعیت تایید ایمیل باید true/false باشد'),
    body('expertise')
        .optional()
        .isArray().withMessage('نوع فیلد تخصص ها باید از نوع آرایه یا لیست باشد'),
    body('expertise.*')
        .optional()
        .trim()
        .notEmpty().withMessage('تخصص ها نمی توانند متن خالی باشند')
];

// All routes are protected and admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUserValidation, validateRequest, updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/activate', toggleUserStatus);

module.exports = router;