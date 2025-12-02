const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (user, tokenVersion) => {
    return jwt.sign({ id: user._id, role: user.role, tokenVersion }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'کاربر با این ایمیل وجود دارد'
            });
        }

        // Since role is optional, we use an extra variable to put default value
        let userRole = role || 'student';
        if (role && (role === 'admin')) {
            return res.status(400).json({
                success: false,
                message: 'عدم دسترسی به ایجاد کاربر با این نقش'
            })
        }

        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
            role: userRole
        });

        const token = generateToken(user, user.tokenVersion);

        res.status(201).json({
            success: true,
            message: 'کاربر با موفقیت ساخته شد',
            data: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                isEmailVerified: user.isEmailVerified
            },
            token
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'فیلد های رمز و ایمیل اجباری هستند'
            });
        }

        // Force include password because password is hidden by default for queries
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ایمیل یا رمز عبور شما اشتباه است'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'حساب کاربری شما مسدود شده است. لطفا با پشتیبانی تماس بگیرید'
            });
        }

        // Compare password using the schema method
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'ایمیل یا رمز عبور شما اشتباه است'
            });
        }

        // Login the user 👇
        user.lastLogin = Date.now();
        // Don't validate the whole document (old invalid data should not break the login flow)
        await user.save({ validateBeforeSave: false });

        const token = generateToken(user, user.tokenVersion);

        res.status(200).json({
            success: true,
            message: 'ورود با موفقیت انجام شد',
            data: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                bio: user.bio,
                expertise: user.expertise,
                isEmailVerified: user.isEmailVerified,
                lastLogin: user.lastLogin
            },
            token
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = async (req, res, next) => {
    // Field for update: firstName, lastName, bio, avatar, expertise
    try {
        const fieldsToUpdate = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            bio: req.body.bio,
            avatar: req.body.avatar
        };

        // If user is instructor, allow updating expertise
        if (req.user.role === 'instructor') {
            fieldsToUpdate.expertise = req.body.expertise;
        }

        // Remove undefined fields
        Object.keys(fieldsToUpdate).forEach((key) => {
            if (fieldsToUpdate[key] === undefined) delete fieldsToUpdate[key];
        });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            fieldsToUpdate,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            message: 'اطلاعات شما با موفقیت به‌روزرسانی شد',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'لطفا رمز جاری و رمز جدید را وارد کنید'
            });
        }

        // Get user with password
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'رمز شما نامعتبر است'
            });
        }

        // Update password
        user.password = newPassword;

        // Increment token version to invalidate all existing tokens
        user.tokenVersion += 1;

        await user.save();

        // Generate new token with new version
        const token = generateToken(user._id, user.tokenVersion);

        res.status(200).json({
            success: true,
            message: 'رمز شما با موفقیت تغییر کرد',
            token
        });
    } catch (error) {
        next(error);
    }
};
// @route   POST /api/auth/logoutall
// @access  Private
// exports.logoutAllDevices = async (req, res, next) => {
//     try {
//         const user = await User.findById(req.user.id);

//         // Increment token version to invalidate all existing tokens
//         user.tokenVersion += 1;
//         await user.save({ validateBeforeSave: false });

//         // Generate new token with new version
//         const token = generateToken(user._id, user.tokenVersion);

//         res.status(200).json({
//             success: true,
//             message: 'Logged out from all devices successfully. Use the new token to continue.',
//             token
//         });
//     } catch (error) {
//         next(error);
//     }
// };