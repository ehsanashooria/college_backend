const Question = require("../models/Question");
const Answer = require("../models/Answer");
const Lesson = require("../models/Lesson");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

// @desc    Get all questions for a lesson
// @route   GET /api/lessons/:lessonId/questions
// @access  Private (Enrolled)
exports.getLessonQuestions = async (req, res, next) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "درس یافت نشد",
      });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: lesson.course,
      paymentStatus: "completed",
    });

    const course = await Course.findById(lesson.course);
    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!enrollment && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "شما دسترسی به سوالات ندارید",
      });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const filter = { lesson: lessonId };

    if (req.query.isAnswered !== undefined) {
      filter.isAnswered = req.query.isAnswered === "true";
    }

    const questions = await Question.find(filter)
      .populate("student", "firstName lastName avatar")
      .populate("answeredBy", "firstName lastName avatar")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Question.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: questions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single question
// @route   GET /api/questions/:id
// @access  Private (Enrolled)
exports.getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate("student", "firstName lastName avatar")
      .populate("lesson", "title")
      .populate("answeredBy", "firstName lastName avatar")
      .populate("answers");

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "سوال یافت نشد",
      });
    }

    // Check access
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: question.course,
      paymentStatus: "completed",
    });

    const course = await Course.findById(question.course);
    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!enrollment && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "شما دسترسی به این سوال ندارید",
      });
    }

    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ask a question
// @route   POST /api/lessons/:lessonId/questions
// @access  Private (Enrolled Student)
exports.createQuestion = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const { title, content } = req.body;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "درس یافت نشد",
      });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: lesson.course,
      paymentStatus: "completed",
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "برای سوال پرسیدن در این دوره باید در این دوره شرکت کرده باشید",
      });
    }

    const question = await Question.create({
      lesson: lessonId,
      course: lesson.course,
      student: req.user.id,
      title,
      content,
    });

    res.status(201).json({
      success: true,
      message: "سوال با موفقیت ثبت شد",
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private (Question Owner)
exports.updateQuestion = async (req, res, next) => {
  try {
    let question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "سوال یافت نشد",
      });
    }

    // Check ownership
    if (
      question.student.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "شما دسترسی لازم برای تغییر این سوال را ندارید",
      });
    }

    const { title, content } = req.body;

    question = await Question.findByIdAndUpdate(
      req.params.id,
      { title, content },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      message: "سوال با موفقیت به روز شد",
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private (Question Owner/Admin)
exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "سوال یافت نشد",
      });
    }

    // Check ownership
    if (
      question.student.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "شما دسترسی لازم برای حذف این سوال را ندارید",
      });
    }

    // Delete all answers related to this question
    await Answer.deleteMany({ question: question._id });

    await question.deleteOne();

    res.status(200).json({
      success: true,
      message: "سوال با موفقیت حذف شد",
    });
  } catch (error) {
    next(error);
  }
};