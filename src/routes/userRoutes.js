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
        .notEmpty().withMessage('First name cannot be empty')
        .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
    body('lastName')
        .optional()
        .trim()
        .notEmpty().withMessage('Last name cannot be empty')
        .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
    body('email')
        .optional()
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('role')
        .optional()
        .isIn(['student', 'instructor', 'admin']).withMessage('Invalid role'),
    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be a boolean'),
    body('isEmailVerified')
        .optional()
        .isBoolean().withMessage('isEmailVerified must be a boolean')
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