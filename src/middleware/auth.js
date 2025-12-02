const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'شما مجوز دسترسی به این منبع را ندارید'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'کاربر مورد نظر یافت نشد'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'حساب کاربری شما غیرفعال شده است'
      });
    }

    // Check if token version matches (invalidate old tokens after password change)
    if (decoded.tokenVersion !== req.user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'لطفا دوباره وارد شوید'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'شما مجوز دسترسی به این منبع را ندارید'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `شما نقش مورد نیاز برای دسترسی به این منبع را ندارید`
            });
        }
        next();
    };
};

// Check if user is course instructor
exports.isCourseInstructor = (Model) => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params.id || req.params.courseId;
            const resource = await Model.findById(resourceId);

            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: 'منبع یافت نشد'
                });
            }

            // Get course ID based on model
            let courseId;
            if (Model.modelName === 'Course') {
                courseId = resource._id;
            } else if (resource.course) {
                courseId = resource.course;
            }

            const Course = require('../models/Course');
            const course = await Course.findById(courseId);

            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'دوره یافت نشد'
                });
            }

            // Admin can access everything, instructor can only access their courses
            if (req.user.role === 'admin' || course.instructor.toString() === req.user.id) {
                req.course = course;
                next();
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'شما مجوز ویرایش این دوره را ندارید'
                });
            }
        } catch (error) {
            next(error);
        }
    };
};

// Check if student is enrolled in course
exports.isEnrolled = async (req, res, next) => {
    try {
        // Allow admin to access all courses
        if (req.user.role === 'admin') {
            return next();
        }

        const Enrollment = require('../models/Enrollment');
        const Course = require('../models/Course');
        const courseId = req.params.courseId || req.params.id;

        // Check if user is the course instructor
        const course = await Course.findById(courseId);
        if (course && course.instructor.toString() === req.user.id) {
            return next();
        }

        // Check enrollment for students
        const enrollment = await Enrollment.findOne({
            student: req.user.id,
            course: courseId,
            paymentStatus: 'completed'
        });

        if (!enrollment) {
            return res.status(403).json({
                success: false,
                message: 'برای دسترسی به این دوره باید در آن شرکت داشته باشید'
            });
        }

        req.enrollment = enrollment;
        next();
    } catch (error) {
        next(error);
    }
};