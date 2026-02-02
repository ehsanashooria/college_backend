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
        message: "Only students can enroll in courses",
      });
    }

    // Check if course exists and is published
    const course = await Course.findById(courseId).populate(
      "instructor",
      "firstName lastName"
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (!course.isPublished) {
      return res.status(400).json({
        success: false,
        message: "This course is not available for enrollment",
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
          message: "You are already enrolled in this course",
        });
      } else if (existingEnrollment.paymentStatus === "pending") {
        return res.status(400).json({
          success: false,
          message: "You have a pending payment for this course",
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
        transactionId: "FREE_" + Date.now(),
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
        message: "Successfully enrolled in free course",
        data: enrollment,
      });
    }

    // Request payment from gateway
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
        message: "Failed to initiate payment",
        error: paymentResult.message,
      });
    }

    // Create pending enrollment
    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: courseId,
      paymentStatus: "pending",
      paymentAmount: finalPrice,
      paymentMethod: "zarinpal",
      transactionId: paymentResult.authority,
    });

    res.status(201).json({
      success: true,
      message: "Payment initiated. Redirect user to payment gateway.",
      data: {
        enrollment,
        payment: {
          authority: paymentResult.authority,
          paymentUrl: paymentResult.paymentUrl,
          testPaymentUrl: paymentResult.testPaymentUrl, // For testing
          amount: finalPrice,
        },
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
        `${process.env.FRONTEND_URL}/payment/failed?reason=cancelled`
      );
    }

    // Find enrollment by authority (transaction ID)
    const enrollment = await Enrollment.findOne({
      transactionId: Authority,
      paymentStatus: "pending",
    }).populate("course", "title instructor totalEnrollments");

    if (!enrollment) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/failed?reason=not_found`
      );
    }

    // Verify payment with gateway
    const verifyResult = await paymentGateway.verifyPayment(
      Authority,
      enrollment.paymentAmount
    );

    if (!verifyResult.success) {
      enrollment.paymentStatus = "failed";
      await enrollment.save();

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/failed?reason=verification_failed`
      );
    }

    // Update enrollment status
    enrollment.paymentStatus = "completed";
    enrollment.transactionId = verifyResult.refId;
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
      `${process.env.FRONTEND_URL}/payment/success?enrollmentId=${enrollment._id}`
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/failed?reason=error`);
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
        message: "Test payments are not allowed in production",
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
      message: "Payment simulated successfully. Now call verify endpoint.",
      data: {
        authority: result.authority,
        refId: result.refId,
        verifyUrl: `/api/enrollments/verify?Authority=${authority}&Status=OK`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student's enrolled courses
// @route   GET /api/enrollments/mycourses
// @access  Private (Student)
exports.getMyEnrollments = async (req, res, next) => {
  try {
    // Filter
    const filter = { student: req.user.id };

    // Status filter
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    // Completed filter
    if (req.query.isCompleted !== undefined) {
      filter.isCompleted = req.query.isCompleted === "true";
    }

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
        message: "Enrollment not found",
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
        message: "Not authorized to view this enrollment",
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
exports.checkEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.courseId,
    });

    if (!enrollment) {
      return res.status(200).json({
        success: true,
        isEnrolled: false,
        enrollment: null,
      });
    }

    res.status(200).json({
      success: true,
      isEnrolled: enrollment.paymentStatus === "completed",
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

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

    // Calculate total revenue
    const completedEnrollments = await Enrollment.find({
      paymentStatus: "completed",
    });
    const totalRevenue = completedEnrollments.reduce(
      (sum, e) => sum + e.paymentAmount,
      0
    );

    res.status(200).json({
      success: true,
      count: enrollments.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      totalRevenue,
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
        message: "Enrollment not found",
      });
    }

    if (enrollment.paymentStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Only completed enrollments can be refunded",
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
      message: "Refund processed successfully",
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};
