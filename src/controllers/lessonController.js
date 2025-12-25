const Lesson = require('../models/Lesson');

// @desc    Get all lessons for a section
// @route   GET /api/sections/:sectionId/lessons
// @access  Private (Enrolled/Instructor/Admin)
exports.getSectionLessons = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    const course = await Course.findById(section.course);

    // Check access
    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isInstructor && !isAdmin) {
      const Enrollment = require('../models/Enrollment');
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: section.course,
        paymentStatus: 'completed'
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to access lessons'
        });
      }
    }

    const lessons = await Lesson.find({ section: req.params.sectionId })
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      count: lessons.length,
      data: lessons
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single lesson
// @route   GET /api/lessons/:id
// @access  Private (Enrolled/Instructor/Admin)
exports.getLessonById = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('section', 'title')
      .populate('course', 'title');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const course = await Course.findById(lesson.course);

    // Check access
    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isInstructor && !isAdmin) {
      // Check if free lesson
      if (lesson.isFree) {
        return res.status(200).json({
          success: true,
          data: lesson
        });
      }

      // Check enrollment
      const Enrollment = require('../models/Enrollment');
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: lesson.course,
        paymentStatus: 'completed'
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to access this lesson'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new lesson
// @route   POST /api/sections/:sectionId/lessons
// @access  Private (Course Instructor/Admin)
exports.createLesson = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    const course = await Course.findById(section.course);

    // Check ownership
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add lessons to this section'
      });
    }

    const {
      title,
      description,
      type,
      videoUrl,
      videoDuration,
      articleContent,
      attachments,
      order,
      isFree
    } = req.body;

    // If order not provided, set it to be last
    let lessonOrder = order;
    if (lessonOrder === undefined) {
      const lastLesson = await Lesson.findOne({ section: req.params.sectionId })
        .sort({ order: -1 });
      lessonOrder = lastLesson ? lastLesson.order + 1 : 0;
    }

    const lesson = await Lesson.create({
      section: req.params.sectionId,
      course: section.course,
      title,
      description,
      type,
      videoUrl,
      videoDuration,
      articleContent,
      attachments,
      order: lessonOrder,
      isFree: isFree || false
    });

    // Update course total lessons and duration
    course.totalLessons += 1;
    if (videoDuration) {
      course.totalDuration += Math.ceil(videoDuration / 60); // Convert seconds to minutes
    }
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lesson
// @route   PUT /api/lessons/:id
// @access  Private (Course Instructor/Admin)
exports.updateLesson = async (req, res, next) => {
  try {
    let lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const course = await Course.findById(lesson.course);

    // Check ownership
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lesson'
      });
    }

    // If video duration is being updated, adjust course total
    if (req.body.videoDuration && req.body.videoDuration !== lesson.videoDuration) {
      const oldDuration = lesson.videoDuration ? Math.ceil(lesson.videoDuration / 60) : 0;
      const newDuration = Math.ceil(req.body.videoDuration / 60);
      course.totalDuration = course.totalDuration - oldDuration + newDuration;
      await course.save();
    }

    lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete lesson
// @route   DELETE /api/lessons/:id
// @access  Private (Course Instructor/Admin)
exports.deleteLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const course = await Course.findById(lesson.course);

    // Check ownership
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this lesson'
      });
    }

    // Update course totals
    course.totalLessons -= 1;
    if (lesson.videoDuration) {
      course.totalDuration -= Math.ceil(lesson.videoDuration / 60);
    }
    await course.save();

    await lesson.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder lessons in a section
// @route   PUT /api/sections/:sectionId/lessons/reorder
// @access  Private (Course Instructor/Admin)
exports.reorderLessons = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    const course = await Course.findById(section.course);

    // Check ownership
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reorder lessons'
      });
    }

    const { lessons } = req.body; // Array of {id, order}

    if (!Array.isArray(lessons)) {
      return res.status(400).json({
        success: false,
        message: 'Lessons must be an array'
      });
    }

    // Update each lesson's order
    const updatePromises = lessons.map(item => 
      Lesson.findByIdAndUpdate(item.id, { order: item.order })
    );

    await Promise.all(updatePromises);

    const updatedLessons = await Lesson.find({ section: req.params.sectionId })
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      message: 'Lessons reordered successfully',
      data: updatedLessons
    });
  } catch (error) {
    next(error);
  }
};