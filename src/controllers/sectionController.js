const Section = require("../models/Section");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");

// @desc    Get all sections for a course
// @route   GET /api/courses/:courseId/sections
// @access  Private (Enrolled/Instructor/Admin)
exports.getCourseSections = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "دوره یافت نشد",
      });
    }

    // Check access: must be enrolled, instructor, or admin
    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isInstructor && !isAdmin) {
      // Check if student is enrolled
      const Enrollment = require("../models/Enrollment");
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: req.params.courseId,
        paymentStatus: "completed",
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: "برای دسترسی به بخش های این دوره باید ابتدا در آن شرکت کنید",
        });
      }
    }

    const sections = await Section.find({ course: req.params.courseId })
      .sort({ order: 1 })
      .populate({
        path: "lessons",
        options: { sort: { order: 1 } },
      });

    res.status(200).json({
      success: true,
      count: sections.length,
      data: sections,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new section
// @route   POST /api/courses/:courseId/sections
// @access  Private (Course Instructor/Admin)
exports.createSection = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "دوره یافت نشد",
      });
    }

    // Check ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "شما مجاز به اضافه کردن بخش به این دوره نیستید",
      });
    }

    const { title, description, order } = req.body;

    // If order not provided, set it to be last
    let sectionOrder = order;
    if (sectionOrder === undefined) {
      const lastSection = await Section.findOne({
        course: req.params.courseId,
      }).sort({ order: -1 });
      sectionOrder = lastSection ? lastSection.order + 1 : 0;
    }

    const section = await Section.create({
      course: req.params.courseId,
      title,
      description,
      order: sectionOrder,
    });

    res.status(201).json({
      success: true,
      message: "بخش با موفقیت ایجاد شد",
      data: section,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder sections
// @route   PUT /api/courses/:courseId/sections/reorder
// @access  Private (Course Instructor/Admin)
exports.reorderSections = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "دوره یافت نشد",
      });
    }

    // Check ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "شما دسترسی به عوض کردن ترتیب بخش های این دوره ندارید",
      });
    }

    const { sections } = req.body; // Array of {id, order}

    if (!Array.isArray(sections)) {
      return res.status(400).json({
        success: false,
        message: "فیلد بخش ها باید آرایه یا لیست باشد",
      });
    }

    // Update each section's order
    const updatePromises = sections.map((item) =>
      Section.findByIdAndUpdate(item.id, { order: item.order })
    );

    await Promise.all(updatePromises);

    const updatedSections = await Section.find({
      course: req.params.courseId,
    }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      message: "ترتیب بخش ها با موفقیت تغییر یافت",
      data: updatedSections,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single section
// @route   GET /api/sections/:id
// @access  Private (Enrolled/Instructor/Admin)
exports.getSectionById = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id).populate({
      path: "lessons",
      options: { sort: { order: 1 } },
    });
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "بخش یافت نشد",
      });
    }

    const course = await Course.findById(section.course);

    // Check access
    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isInstructor && !isAdmin) {
      const Enrollment = require("../models/Enrollment");
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: section.course,
        paymentStatus: "completed",
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message:
            "شما باید در این دوره شرکت کرده باشید تا بتوانید به این بخش دسترسی پیدا کنید",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update section
// @route   PUT /api/sections/:id
// @access  Private (Course Instructor/Admin)
exports.updateSection = async (req, res, next) => {
  try {
    let section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "بخش یافت نشد",
      });
    }

    const course = await Course.findById(section.course);

    // Check ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "شما مجاز به ویرایش این بخش نیستید",
      });
    }

    section = await Section.findByIdAndUpdate(
      req.params.id,
      // we don't update order here
      {
        title: req.body.title,
        description: req.body.description,
        isPublished: req.body.isPublished,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "بخش با موفقیت به روز شد",
      data: section,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete section
// @route   DELETE /api/sections/:id
// @access  Private (Course Instructor/Admin)
exports.deleteSection = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "بخش یافت نشد",
      });
    }

    const course = await Course.findById(section.course);

    // Check ownership
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "دسترسی به حذف این بخش ندارید",
      });
    }

    // Check if section has lessons (optional, remove it later if not needed)
    const lessonCount = await Lesson.countDocuments({ section: section._id });

    if (lessonCount > 0) {
      return res.status(400).json({
        success: false,
        message: `لطفا ابتدا تمام دروس این بخش (${lessonCount}) را حذف کنید سپس دوباره تلاش کنید`,
      });
    }

    await section.deleteOne();

    res.status(200).json({
      success: true,
      message: "بخش با موفقیت حذف شد",
    });
  } catch (error) {
    next(error);
  }
};
