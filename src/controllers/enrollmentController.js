const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const User = require("../models/User");
const paymentGateway = require("../utils/paymentGateway");

// @desc    Initiate enrollment (request payment)
// @route   POST /api/enrollments
// @access  Private (Student)
exports.initiateEnrollment = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    // Validate: Only students can enroll
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "فقط دانش آموز ها می توانند در دوره ها ثبت نام کنند",
      });
    }

    // Check if course exists and is published
    const course = await Course.findById(courseId).populate(
      "instructor",
      "firstName lastName",
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "دوره یافت نشد",
      });
    }

    if (!course.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "در حال حاضر شرکت در این دوره مجاز نیست",
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
    });

    if (existingEnrollment) {
      if (existingEnrollment.paymentStatus === "completed") {
        return res.status(400).json({
          success: false,
          message: "شما در این دوره شرکت کرده اید",
        });
      } else if (existingEnrollment.paymentStatus === "pending") {
        return res.status(400).json({
          success: false,
          message: "شما یک پرداخت در حال انتظار برای این دوره دارید",
          enrollment: existingEnrollment,
        });
      }
    }

    // Calculate final price (with discount if available)
    const finalPrice = course.discountPrice || course.price;

    // Handle free courses
    if (finalPrice === 0) {
      const enrollment = await Enrollment.create({
        student: req.user.id,
        course: courseId,
        paymentStatus: "completed",
        paymentAmount: 0,
        paymentMethod: "free",
        paymentAuthority: "FREE_AUTH" + Date.now(),
        paymentRefId: "FREE_REF" + Date.now(),
      });

      // Update course enrollment count
      course.totalEnrollments += 1;
      await course.save();

      // Update instructor stats
      await User.findByIdAndUpdate(course.instructor._id, {
        $inc: { totalStudentsEnrolled: 1 },
      });

      return res.status(201).json({
        success: true,
        message: "شما با موفقیت در دوره رایگان ثبت نام کردید",
        data: enrollment,
      });
    }

    // Payment gateway redirects user here (verify payment)
    const callbackUrl = `${process.env.BACKEND_URL}/api/enrollments/verify`;

    const paymentResult = await paymentGateway.requestPayment({
      amount: finalPrice,
      description: `ثبت‌نام در دوره: ${course.title}`,
      callbackUrl,
      mobile: req.user.phone || "",
      email: req.user.email,
    });

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: "درخواست پرداخت ناموفق بود",
        error: paymentResult.message,
      });
    }

    // Create pending enrollment if request payment was successful
    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: courseId,
      paymentStatus: "pending",
      paymentAmount: finalPrice,
      paymentMethod: "zarinpal",
      paymentAuthority: paymentResult.authority,
    });

    res.status(201).json({
      success: true,
      message: "درخواست پرداخت ثبت شد. کاربر را به درگاه پرداخت هدایت کنید",
      data: {
        enrollment,
        payment: {
          authority: paymentResult.authority,
          testPaymentUrl: paymentResult.testPaymentUrl, // For testing (it's in frontend now)
          amount: finalPrice,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate successful payment (TESTING ONLY)
// @route   POST /api/enrollments/test-payment/:authority
// @access  Public (for testing)
exports.testPayment = async (req, res, next) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "پرداخت های تستی در حال حاضر مجاز نیستند",
      });
    }

    const { authority } = req.params;

    // Simulate successful payment
    const result = await paymentGateway.simulateSuccessfulPayment(authority);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "پرداخت با موفقیت شبیه سازی شد. کاربر را به صفحه تایید هدایت کنید",
      data: {
        authority: result.authority,
        refId: result.refId,
        // This can use callback url from payment gateway - but we put it here hardcoded for testing
        verifyUrl: `/api/enrollments/verify?Authority=${authority}&Status=OK`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify payment and complete enrollment
// @route   GET /api/enrollments/verify
// @access  Public (callback from payment gateway)
exports.verifyEnrollment = async (req, res, next) => {
  try {
    const { Authority, Status } = req.query;

    // Check if payment was successful (Status = 'OK' from ZarinPal)
    if (Status !== "OK") {
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/failed?reason=cancelled`,
      );
    }

    // Find enrollment by authority (transaction ID)
    const enrollment = await Enrollment.findOne({
      paymentAuthority: Authority,
      paymentStatus: "pending",
    }).populate("course", "title instructor totalEnrollments");

    if (!enrollment) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/failed?reason=not_found`,
      );
    }

    // Verify payment with gateway
    const verifyResult = await paymentGateway.verifyPayment(
      Authority,
      enrollment.paymentAmount,
    );

    if (!verifyResult.success) {
      enrollment.paymentStatus = "failed";
      await enrollment.save();

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/failed?reason=verification_failed`,
      );
    }

    // Update enrollment status
    enrollment.paymentStatus = "completed";
    enrollment.paymentRefId = verifyResult.refId;
    await enrollment.save();

    // Update course stats
    const course = await Course.findById(enrollment.course._id);
    course.totalEnrollments += 1;
    await course.save();

    // Update instructor stats
    await User.findByIdAndUpdate(course.instructor, {
      $inc: { totalStudentsEnrolled: 1 },
    });

    // Redirect to success page
    res.redirect(
      `${process.env.FRONTEND_URL}/payment/success?enrollmentId=${enrollment._id}`,
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/failed?reason=error`);
  }
};

// @desc    Get student's enrolled courses
// @route   GET /api/enrollments/mycourses
// @access  Private (Student)
exports.getMyEnrollments = async (req, res, next) => {
  try {
    // Filter
    const filter = { student: req.user.id };

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const enrollments = await Enrollment.find(filter)
      .populate({
        path: "course",
        select:
          "title slug thumbnail instructor totalDuration totalLessons averageRating",
        populate: {
          path: "instructor",
          select: "firstName lastName avatar",
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Enrollment.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: enrollments.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: enrollments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single enrollment
// @route   GET /api/enrollments/:id
// @access  Private (Student owner/Instructor/Admin)
exports.getEnrollmentById = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate("student", "firstName lastName email avatar")
      .populate({
        path: "course",
        populate: {
          path: "instructor",
          select: "firstName lastName avatar",
        },
      })
      .populate("completedLessons", "title")
      .populate("lastAccessedLesson", "title");

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "رکورد یافت نشد",
      });
    }

    // Check access
    const isStudent = enrollment.student._id.toString() === req.user.id;
    const isInstructor =
      enrollment.course.instructor._id.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isStudent && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "شما دسترسی به مشاهده این دوره ندارید",
      });
    }

    res.status(200).json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if user is enrolled in a course
// @route   GET /api/enrollments/course/:courseId/check
// @access  Private
// exports.checkEnrollment = async (req, res, next) => {
//   try {
//     const enrollment = await Enrollment.findOne({
//       student: req.user.id,
//       course: req.params.courseId,
//     });

//     if (!enrollment) {
//       return res.status(200).json({
//         success: true,
//         isEnrolled: false,
//         enrollment: null,
//       });
//     }

//     res.status(200).json({
//       success: true,
//       isEnrolled: enrollment.paymentStatus === "completed",
//       enrollment,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// @desc    Get all enrollments (Admin only)
// @route   GET /api/enrollments
// @access  Private/Admin
exports.getAllEnrollments = async (req, res, next) => {
  try {
    // Filters
    const filter = {};

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.course) {
      filter.course = req.query.course;
    }

    if (req.query.student) {
      filter.student = req.query.student;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const enrollments = await Enrollment.find(filter)
      .populate("student", "firstName lastName email")
      .populate("course", "title instructor")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Enrollment.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: enrollments.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: enrollments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process refund (Admin only)
// @route   PUT /api/enrollments/:id/refund
// @access  Private/Admin
exports.processRefund = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "رکورد یافت نشد",
      });
    }

    if (enrollment.paymentStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message: "فقط دوره هایی که پرداخت کامل شده اند می توانند استرداد شوند",
      });
    }

    // Update enrollment
    enrollment.paymentStatus = "refunded";
    await enrollment.save();

    // Update course stats
    await Course.findByIdAndUpdate(enrollment.course, {
      $inc: { totalEnrollments: -1 },
    });

    res.status(200).json({
      success: true,
      message: "عملیات استرداد با موفقیت انجام شد",
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};
