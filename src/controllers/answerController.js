const Answer = require("../models/Answer");
const Question = require("../models/Question");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

// @desc    Get all answers for a question
// @route   GET /api/questions/:questionId/answers
// @access  Private (Enrolled)
exports.getQuestionAnswers = async (req, res, next) => {
  try {
    const { questionId } = req.params;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "سوال یافت نشد",
      });
    }

    // Check enrollment
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
        message: "برای مشاهده پاسخ‌ها در این دوره باید در این دوره شرکت کرده باشید",
      });
    }

    const answers = await Answer.find({ question: questionId })
      .populate("user", "firstName lastName avatar role")
      .sort({ isAccepted: -1, upvotes: -1, createdAt: -1 }); // Accepted first, then by upvotes

    res.status(200).json({
      success: true,
      count: answers.length,
      data: answers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Post an answer
// @route   POST /api/questions/:questionId/answers
// @access  Private (Enrolled/Instructor)
exports.createAnswer = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { content } = req.body;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "سوال یافت نشد",
      });
    }

    // Check enrollment or instructor
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
        message: "برای پاسخ دادن در این دوره باید در این دوره شرکت کرده باشید",
      });
    }

    const answer = await Answer.create({
      question: questionId,
      user: req.user.id,
      content,
      isInstructorAnswer: isInstructor || isAdmin,
    });

    // Update question
    question.totalAnswers += 1;
    if (!question.isAnswered) {
      question.isAnswered = true;
      question.answeredBy = req.user.id;
      question.answeredAt = Date.now();
    }
    await question.save();

    res.status(201).json({
      success: true,
      message: "پاسخ با موفقیت ثبت شد",
      data: answer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update answer
// @route   PUT /api/answers/:id
// @access  Private (Answer Owner)
exports.updateAnswer = async (req, res, next) => {
  try {
    let answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "پاسخ یافت نشد",
      });
    }

    // Check ownership
    if (answer.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "دسترسی به ویرایش این پاسخ را ندارید",
      });
    }

    const { content } = req.body;

    answer = await Answer.findByIdAndUpdate(
      req.params.id,
      { content },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      message: "پاسخ با موفقیت ویرایش شد",
      data: answer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete answer
// @route   DELETE /api/answers/:id
// @access  Private (Answer Owner/Admin)
exports.deleteAnswer = async (req, res, next) => {
  try {
    const answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "سوال یافت نشد",
      });
    }

    // Check ownership
    if (answer.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "دسترسی به حذف این پاسخ را ندارید",
      });
    }

    // Update question
    const question = await Question.findById(answer.question);
    if (question) {
      question.totalAnswers -= 1;
      await question.save();
    }

    await answer.deleteOne();

    res.status(200).json({
      success: true,
      message: "پاسخ با موفقیت حذف شد",
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Accept answer
// @route   PUT /api/answers/:id/accept
// @access  Private (Question Owner/Instructor)
exports.acceptAnswer = async (req, res, next) => {
  try {
    const answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "پاسخ یافت نشد",
      });
    }

    const question = await Question.findById(answer.question);
    const course = await Course.findById(question.course);

    // Check if user is question owner or instructor
    const isQuestionOwner = question.student.toString() === req.user.id;
    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isQuestionOwner && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "فقط صاحب سوال یا مدرس دوره می‌تواند این پاسخ را به عنوان پاسخ پذیرفته شده انتخاب کند",
      });
    }

    // Unaccept all other answers for this question
    await Answer.updateMany(
      { question: answer.question },
      { isAccepted: false },
    );

    // Accept this answer
    answer.isAccepted = true;
    await answer.save();

    res.status(200).json({
      success: true,
      message: "پاسخ با موفقیت به عنوان پاسخ پذیرفته شده انتخاب شد",
      data: answer,
    });
  } catch (error) {
    next(error);
  }
};