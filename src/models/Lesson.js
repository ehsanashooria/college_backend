const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: {
      type: String,
      required: [true, "عنوان درس اجباری است"],
      trim: true,
      maxlength: [200, "عنوان نمی‌تواند بیش از 200 کاراکتر باشد"],
    },
    description: {
      type: String,
      maxlength: [1000, "توضیحات نمی‌تواند بیش از 1000 کاراکتر باشد"],
    },
    type: {
      type: String,
      enum: ["video", "article", "quiz", "assignment"],
      default: "video",
    },
    // Video content
    videoUrl: {
      type: String,
      default: "",
    },
    videoDuration: {
      type: Number, // in seconds
      default: 0,
    },
    // Article content
    articleContent: {
      type: String,
    },
    // Attachments
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileSize: Number, // in bytes
        fileType: String,
      },
    ],
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Lesson", lessonSchema);
