const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    // Payment information
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentAmount: {
      type: Number,
      required: true,
    },
    paymentAuthority: {
      type: String,
      index: true,
    },
    paymentRefId: {
      type: String,
      index: true,
    },
    paidAt: {
      type: Date,
    },
    completedLessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
    lastAccessedLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
    },
    lastAccessedAt: {
      type: Date,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to ensure one enrollment per student per course
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
