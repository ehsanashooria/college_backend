const Category = require('../models/Category');
const Course = require('../models/Course');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
    try {
        const filter = {};

        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === 'true';
        }

        if (req.query.search) {
            filter.name = { $regex: req.query.search, $options: 'i' };
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Get categories
        const categories = await Category.find(filter)
            .select('-description')
            .limit(limit)
            .skip(skip)
            .sort({ name: 1 });

        // Get total count
        const total = await Category.countDocuments(filter);

        // Optionally include course count for each category
        if (req.query.includeCourseCount === 'true') {
            const categoriesWithCount = await Promise.all(
                categories.map(async (category) => {
                    const courseCount = await Course.countDocuments({
                        // although category is an array in Couse model, this code still works correctly
                        category: category._id,
                        isPublished: true
                    });
                    return {
                        ...category.toObject(),
                        courseCount
                    };
                })
            );

            return res.status(200).json({
                success: true,
                count: categoriesWithCount.length,
                total,
                page,
                pages: Math.ceil(total / limit),
                data: categoriesWithCount
            });
        }

        res.status(200).json({
            success: true,
            count: categories.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: categories
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
exports.getCategoryById = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'دسته بندی یافت نشد'
            });
        }

        // Optionally include courses in this category
        if (req.query.includeCourses === 'true') {
            const courses = await Course.find({
                category: category._id,
                isPublished: true
            })
                .select('title slug description thumbnail price discountPrice level averageRating totalEnrollments')
                .populate('instructor', 'firstName lastName avatar');

            return res.status(200).json({
                success: true,
                data: {
                    ...category.toObject(),
                    courses
                }
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get category by slug
// @route   GET /api/categories/slug/:slug
// @access  Public
exports.getCategoryBySlug = async (req, res, next) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'دسته بندی یافت نشد'
            });
        }

        // Include courses in this category
        const courses = await Course.find({
            category: category._id,
            isPublished: true
        })
            .select('title slug description thumbnail price discountPrice level averageRating totalEnrollments')
            .populate('instructor', 'firstName lastName avatar');

        res.status(200).json({
            success: true,
            data: {
                ...category.toObject(),
                courses
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res, next) => {
    try {
        const { name, description, icon } = req.body;

        // Check if category already exists
        const categoryExists = await Category.findOne({ name });

        if (categoryExists) {
            return res.status(400).json({
                success: false,
                message: 'دسته بندی با این نام از قبل وجود دارد'
            });
        }

        const category = await Category.create({
            name,
            description,
            icon
        });

        res.status(201).json({
            success: true,
            message: 'دسته بندی با موفقیت ساخته شد',
            data: category
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res, next) => {
    try {
        const { name, description, icon, isActive } = req.body;

        let category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'دسته بندی یافت نشد'
            });
        }

        // If name is being changed, check for duplicates
        if (name && name !== category.name) {
            const categoryExists = await Category.findOne({
                name,
                _id: { $ne: req.params.id }
            });

            if (categoryExists) {
                return res.status(400).json({
                    success: false,
                    message: 'این نام دسته بندی از قبل وجود دارد'
                });
            }
        }

        // Update fields
        const fieldsToUpdate = {};
        if (name !== undefined) fieldsToUpdate.name = name;
        if (description !== undefined) fieldsToUpdate.description = description;
        if (icon !== undefined) fieldsToUpdate.icon = icon;
        if (isActive !== undefined) fieldsToUpdate.isActive = isActive;

        category = await Category.findByIdAndUpdate(
            req.params.id,
            fieldsToUpdate,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            message: 'دسته بندی با موفقیت ویرایش شد',
            data: category
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'دسته بندی یافت نشد'
            });
        }

        // Check if category has courses
        const coursesCount = await Course.countDocuments({ category: category._id });

        if (coursesCount > 0) {
            return res.status(400).json({
                success: false,
                message: `نمی توانید این دسته بندی را حذف کنید زیرا ${coursesCount} دوره به آن اختصاص داده شده است`
            });
        }

        await category.deleteOne();

        res.status(200).json({
            success: true,
            message: 'دسته بندی با موفقیت حذف شد'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get category statistics
// @route   GET /api/categories/:id/statistics
// @access  Private/Admin
exports.getCategoryStatistics = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'دسته بندی یافت نشد'
            });
        }

        // Get course statistics
        const totalCourses = await Course.countDocuments({ category: category._id });
        const publishedCourses = await Course.countDocuments({
            category: category._id,
            isPublished: true
        });

        // Get total enrollments across all courses in this category
        const courses = await Course.find({ category: category._id });
        const totalEnrollments = courses.reduce((sum, course) => sum + course.totalEnrollments, 0);

        // Get average rating
        const averageRating = courses.length > 0
            ? courses.reduce((sum, course) => sum + course.averageRating, 0) / courses.length
            : 0;

        res.status(200).json({
            success: true,
            data: {
                category: category.name,
                totalCourses,
                publishedCourses,
                draftCourses: totalCourses - publishedCourses,
                totalEnrollments,
                averageRating: Math.round(averageRating * 10) / 10
            }
        });
    } catch (error) {
        next(error);
    }
};