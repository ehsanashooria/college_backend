const CourseProgress = require('../models/CourseProgress');
const LessonProgress = require('../models/LessonProgress');
const Enrollment = require('../models/Enrollment');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');

// @desc    Get course progress
// @route   GET /api/progress/course/:courseId
// @access  Private
exports.getCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
      paymentStatus: 'completed'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'شما باید در این دوره شرکت کرده باشید'
      });
    }

    // Get or create course progress
    let courseProgress = await CourseProgress.findOne({
      student: req.user.id,
      course: courseId
    });

    if (!courseProgress) {
      courseProgress = await CourseProgress.create({
        student: req.user.id,
        course: courseId,
        enrollment: enrollment._id,
        completedLessonsCount: 0
      });
    }

    res.status(200).json({
      success: true,
      data: courseProgress
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lesson progress
// @route   GET /api/progress/lesson/:lessonId
// @access  Private
exports.getLessonProgress = async (req, res, next) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'درس پیدا نشد'
      });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: lesson.course,
      paymentStatus: 'completed'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'شما باید در این دوره شرکت کرده باشید'
      });
    }

    // Get or create lesson progress
    let lessonProgress = await LessonProgress.findOne({
      student: req.user.id,
      lesson: lessonId
    });

    if (!lessonProgress) {
      lessonProgress = {
        student: req.user.id,
        lesson: lessonId,
        course: lesson.course,
        watchedDuration: 0,
        isCompleted: false,
        completedAt: null,
        lastWatchedAt: null
      };
    }

    res.status(200).json({
      success: true,
      data: lessonProgress
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lesson progress
// @route   POST /api/progress/lesson/:lessonId
// @access  Private
exports.updateLessonProgress = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const { watchedDuration } = req.body;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'درس یافت نشد'
      });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: lesson.course,
      paymentStatus: 'completed'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'شما باید در این دوره شرکت کرده باشید'
      });
    }

    // Update or create lesson progress
    let lessonProgress = await LessonProgress.findOne({
      student: req.user.id,
      lesson: lessonId
    });

    if (!lessonProgress) {
      lessonProgress = await LessonProgress.create({
        student: req.user.id,
        lesson: lessonId,
        course: lesson.course,
        watchedDuration,
        lastWatchedAt: Date.now()
      });
    } else {
      lessonProgress.watchedDuration = watchedDuration;
      lessonProgress.lastWatchedAt = Date.now();
      await lessonProgress.save();
    }

    res.status(200).json({
      success: true,
      data: lessonProgress
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark lesson as completed
// @route   PUT /api/progress/lesson/:lessonId/complete
// @access  Private
exports.markLessonComplete = async (req, res, next) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'درس پیدا نشد'
      });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: lesson.course,
      paymentStatus: 'completed'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'شما باید در این دوره شرکت کرده باشید'
      });
    }

    // Update or create lesson progress
    let lessonProgress = await LessonProgress.findOne({
      student: req.user.id,
      lesson: lessonId
    });

    const wasNotCompleted = !lessonProgress || !lessonProgress.isCompleted;

    if (!lessonProgress) {
      lessonProgress = await LessonProgress.create({
        student: req.user.id,
        lesson: lessonId,
        course: lesson.course,
        isCompleted: true,
        completedAt: Date.now(),
        lastWatchedAt: Date.now()
      });
    } else if (!lessonProgress.isCompleted) {
      lessonProgress.isCompleted = true;
      lessonProgress.completedAt = Date.now();
      lessonProgress.lastWatchedAt = Date.now();
      await lessonProgress.save();
    }

    // Update course progress (only if lesson was just completed)
    if (wasNotCompleted) {
      let courseProgress = await CourseProgress.findOne({
        student: req.user.id,
        course: lesson.course
      });

      if (!courseProgress) {
        courseProgress = await CourseProgress.create({
          student: req.user.id,
          course: lesson.course,
          enrollment: enrollment._id,
          completedLessonsCount: 1
        });
      } else {
        courseProgress.completedLessonsCount += 1;
        await courseProgress.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'درس با موفقیت تکمیل شد',
      data: lessonProgress
    });
  } catch (error) {
    next(error);
  }
};