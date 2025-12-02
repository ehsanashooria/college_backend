const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
    try {
        // Filter options
        const filter = {};

        // Always exclude admins
        filter.role = { $ne: 'admin' };

        // If user wants a specific role (but NOT admin)
        if (req.query.role) {
            filter.role = {
                $ne: 'admin',
                $eq: req.query.role
            };
        }

        // Filter by active status
        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === 'true';
        }

        // Search by name or email
        if (req.query.search) {
            filter.$or = [
                { firstName: { $regex: req.query.search, $options: 'i' } },
                { lastName: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get users
        const users = await User.find(filter)
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 });

        // Get total count
        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'کاربر یافت نشد'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
    try {
        const fieldsToUpdate = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            role: req.body.role,
            bio: req.body.bio,
            expertise: req.body.expertise,
            isActive: req.body.isActive,
            isEmailVerified: req.body.isEmailVerified
        };

        // Remove undefined fields
        Object.keys(fieldsToUpdate).forEach((key) => {
            if (fieldsToUpdate[key] === undefined) delete fieldsToUpdate[key];
        });

        const user = await User.findByIdAndUpdate(
            req.params.id,
            fieldsToUpdate,
            {
                new: true,
                runValidators: true
            }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'کاربر یافت نشد'
            });
        }

        res.status(200).json({
            success: true,
            message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'کاربر پیدا نشد'
            });
        }

        // Prevent deleting admins
        if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'شما نمی توانید حساب یک مدیر را حذف کنید'
            });
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: 'کاربر با موفقیت حذف شد'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Activate or deactivate user
// @route   PUT /api/users/:id/activate
// @access  Private/Admin
exports.toggleUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'کاربر یافت نشد'
            });
        }

        // Prevent deactivating own account
        if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'شما نمی توانید وضعیت یک مدیر را تغییر دهید'
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.status(200).json({
            success: true,
            message: `وضعیت کاربر با موفقیت به ${user.isActive ? 'فعال' : 'غیرفعال'} تغییر یافت`,
            data: user
        });
    } catch (error) {
        next(error);
    }
};