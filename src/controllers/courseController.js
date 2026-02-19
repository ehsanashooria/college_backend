const Course = require("../models/Course");
const Category = require("../models/Category");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");

// @desc    Get all courses (with advanced filtering)
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res, next) => {
  try {
    const filter = { status: "published" };

    if (req.query.category) {
      const categories = req.query.category.split(",");
      filter.category = { $in: categories };
    }

    if (req.query.level) {
      filter.level = req.query.level;
    }

    // Price filter
    if (req.query.priceMin || req.query.priceMax) {
      filter.price = {};
      if (req.query.priceMin)
        filter.price.$gte = parseFloat(req.query.priceMin);
      if (req.query.priceMax)
        filter.price.$lte = parseFloat(req.query.priceMax);
    }

    // Search by title, description, or tags
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Instructor filter
    if (req.query.instructor) {
      filter.instructor = req.query.instructor;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Sort options
    let sortOption = { createdAt: -1 };

    if (req.query.sort) {
      switch (req.query.sort) {
        case "price-asc":
          sortOption = { price: 1 };
          break;
        case "price-desc":
          sortOption = { price: -1 };
          break;
        case "rating":
          sortOption = { averageRating: -1 };
          break;
        case "popular":
          sortOption = { totalEnrollments: -1 };
          break;
        case "title":
          sortOption = { title: 1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
    }

    // Execute query
    const courses = await Course.find(filter)
      .populate("instructor", "firstName lastName avatar expertise")
      .populate("category", "name slug")
      .select("-sections") // Exclude sections in list view
      .limit(limit)
      .skip(skip)
      .sort(sortOption);

    // Get total count
    const total = await Course.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: courses.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Public
exports.getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate(
        "instructor",
        "firstName lastName avatar bio expertise totalCoursesCreated totalStudentsEnrolled",
      )
      .populate("category", "name slug")
      .populate({
        path: "sections",
        select: "title",
        populate: {
          path: "lessons",
          select: "title duration type order isFree", // adjust fields as needed
        },
      });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "دوره یافت نشد",
      });
    }
    // If course is not published, only instructor, admin
    // if (course.status !== "published") {
    //   return res.status(403).json({
    //     success: false,
    //     message: "این دوره هنوز انتشار نیافته است",
    //   });
    // }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course by slug
// @route   GET /api/courses/slug/:slug
// @access  Public
exports.getCourseBySlug = async (req, res, next) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate(
        "instructor",
        "firstName lastName avatar bio expertise totalCoursesCreated totalStudentsEnrolled",
      )
      .populate("category", "name slug");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "دوره یافت نشد",
      });
    }

    if (course.status !== "published") {
      if (!req.user) {
        return res.status(403).json({
          success: false,
          message: "این دوره هنوز انتشار نیافته است",
        });
      }

      const isInstructor = course.instructor._id.toString() === req.user.id;
      const isAdmin = req.user.role === "admin";

      if (!isInstructor && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "این دوره هنوز انتشار نیافته است",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get instructor's courses
// @route   GET /api/courses/instructor/mycourses
// @access  Private (Instructor)
exports.getInstructorCourses = async (req, res, next) => {
  try {
    // Filter options
    const filter = { instructor: req.user.id };

    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const courses = await Course.find(filter)
      .populate("category", "name slug")
      .populate("sections", "title")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Course.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: courses.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Instructor/Admin)
exports.createCourse = async (req, res, next) => {
  try {
    const {
      title,
      description,
      shortDescription,
      category,
      thumbnail,
      level,
      price,
      discountPrice,
      tags,
      whatYouWillLearn,
    } = req.body;

    // Verify category exists
    const categoriesCount = await Category.countDocuments({
      _id: { $in: category },
    });

    if (categoriesCount !== category.length) {
      return res.status(404).json({
        success: false,
        message: "دسته بندی هایی که وارد کرده اید یافت نشدند",
      });
    }

    // if some of these fields are missing, they will be undefined and mongoose ignores them, but as long as they have default values, it's fine
    // watch for important fields like title, description, category, price... they should not be optional
    const course = await Course.create({
      title,
      description,
      shortDescription,
      instructor: req.user.id,
      category,
      thumbnail,
      level,
      price,
      discountPrice,
      tags,
      whatYouWillLearn,
      status: "draft",
    });

    // Update instructor's course count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { totalCoursesCreated: 1 },
    });

    const populatedCourse = await Course.findById(course._id)
      .populate("instructor", "firstName lastName avatar")
      .populate("category", "name slug");

    res.status(201).json({
      success: true,
      message: "دوره با موفقیت ایجاد شد",
      data: populatedCourse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Course Instructor/Admin)
exports.updateCourse = async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);

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
        message: "شما دسترسی به ویرایش این دوره را ندارید",
      });
    }

    // Verify all categories exist
    if (req.body.category) {
      const categoriesCount = await Category.countDocuments({
        _id: { $in: req.body.category },
      });

      if (categoriesCount !== req.body.category.length) {
        return res.status(404).json({
          success: false,
          message: "دسته بندی هایی که وارد کرده اید یافت نشدند",
        });
      }
    }

    const {
      title,
      description,
      shortDescription,
      category,
      thumbnail,
      level,
      price,
      discountPrice,
      tags,
      whatYouWillLearn,
    } = req.body;

    // Again, undefined fields will be ignored by mongoose, so this is safe
    course = await Course.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        shortDescription,
        category,
        thumbnail,
        level,
        price,
        discountPrice,
        tags,
        whatYouWillLearn,
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("instructor", "firstName lastName avatar")
      .populate("category", "name slug");

    res.status(200).json({
      success: true,
      message: "دوره با موفقیت به‌روزرسانی شد",
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Course Instructor/Admin)
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

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
        message: "شما دسترسی به حذف این دوره را ندارید",
      });
    }

    // Check if course has enrollments
    const enrollmentCount = await Enrollment.countDocuments({
      course: course._id,
    });

    if (enrollmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `این دوره دارای ${enrollmentCount} ثبت‌ نام است و نمی‌توان آن را حذف کرد`,
      });
    }

    await course.deleteOne();

    // Update instructor's course count
    await User.findByIdAndUpdate(course.instructor, {
      $inc: { totalCoursesCreated: -1 },
    });

    res.status(200).json({
      success: true,
      message: "دوره با موفقیت حذف شد",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish or Archive course
// @route   PUT /api/courses/:id/changeStatus
// @access  Private (Course Instructor/Admin)
exports.changeCourseStatus = async (req, res, next) => {
  try {
    if (!["draft", "published", "archived"].includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "وضعیت دوره معتبر نیست",
      });
    }

    const course = await Course.findById(req.params.id);

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
        message: "شما دسترسی به انتشار این دوره را ندارید",
      });
    }

    course.status = req.body.status;

    if (course.status === "published" && !course.publishedAt) {
      course.publishedAt = Date.now();
    }

    await course.save();

    res.status(200).json({
      success: true,
      message: `وضعیت دوره با موفقیت تغییر یافت`,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get enrolled students for a course
// @route   GET /api/courses/:id/students
// @access  Private (Course Instructor/Admin)
exports.getCourseStudents = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

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
        message: "شما مجوز مشاهده این اطلاعات را ندارید",
      });
    }

    // Get enrollments
    const enrollments = await Enrollment.find({
      course: req.params.id,
      paymentStatus: "completed",
    })
      .populate("student", "firstName lastName email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    next(error);
  }
};
