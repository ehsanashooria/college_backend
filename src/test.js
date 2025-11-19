// ===========================
// DATABASE MODELS
// ===========================

// src/middleware/auth.js
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
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
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
          message: 'Resource not found'
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
          message: 'Course not found'
        });
      }

      // Admin can access everything, instructor can only access their courses
      if (req.user.role === 'admin' || course.instructor.toString() === req.user.id) {
        req.course = course;
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to modify this course'
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
    const Enrollment = require('../models/Enrollment');
    const courseId = req.params.courseId || req.params.id;

    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
      paymentStatus: 'completed'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to access this resource'
      });
    }

    req.enrollment = enrollment;
    next();
  } catch (error) {
    next(error);
  }
};

// ===========================
// src/middleware/checkOwnership.js


// ===========================
// DATABASE RELATIONSHIPS SUMMARY
// ===========================

/*
RELATIONSHIPS:

1. User (1) -> Course (Many)
   - instructor field in Course references User

2. Course (1) -> Section (Many)
   - course field in Section references Course

3. Section (1) -> Lesson (Many)
   - section field in Lesson references Section

4. Course (1) -> Enrollment (Many)
   - course field in Enrollment references Course

5. User/Student (1) -> Enrollment (Many)
   - student field in Enrollment references User

6. Enrollment (1) -> LessonProgress (Many)
   - enrollment field in LessonProgress references Enrollment

7. Lesson (1) -> Question (Many)
   - lesson field in Question references Lesson

8. Question (1) -> Answer (Many)
   - question field in Answer references Question

9. Course (1) -> Review (Many)
   - course field in Review references Course

10. Category (1) -> Course (Many)
    - category field in Course references Category

INDEXES:
- User: email (unique)
- Course: slug (unique), text search on title/description/tags
- Enrollment: compound index on (student, course) - unique
- LessonProgress: compound index on (student, lesson) - unique
- Review: compound index on (student, course) - unique
*/