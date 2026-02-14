const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "فیلد عنوان دوره اجباری است"],
      trim: true,
      maxlength: [200, "عنوان نمی‌تواند بیش از ۲۰۰ کاراکتر باشد"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "فیلد توضیحات دوره اجباری است"],
      maxlength: [2000, "توضیحات نمی‌تواند بیش از ۲۰۰۰ کاراکتر باشد"],
    },
    shortDescription: {
      type: String,
      maxlength: [300, "توضیحات کوتاه نمی‌تواند بیش از ۳۰۰ کاراکتر باشد"],
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },
    ],
    thumbnail: {
      type: String,
      default: null,
    },
    previewVideo: {
      type: String,
      default: null,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "all-levels"],
      default: "all-levels",
    },
    price: {
      type: Number,
      required: [true, "Course price is required"],
      min: [0, "Price cannot be negative"],
      default: 0,
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price cannot be negative"],
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    whatYouWillLearn: [
      {
        type: String,
        trim: true,
      },
    ],
    // Course Statistics
    totalDuration: {
      type: Number, // in minutes
      default: 0,
    },
    totalLessons: {
      type: Number,
      default: 0,
    },
    totalEnrollments: {
      type: Number,
      default: 0,
    },
    // averageRating: {
    //   type: Number,
    //   min: 0,
    //   max: 5,
    //   default: 0,
    // },
    // totalReviews: {
    //   type: Number,
    //   default: 0,
    // },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate slug before saving
courseSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    let slug = String(this.title).normalize("NFC").trim();
    slug = slug.replace(/\u200c/g, "");
    slug = slug.replace(/\s+/g, "-");
    slug = slug.replace(/[^\p{L}\p{N}-]+/gu, "");
    slug = slug.replace(/-+/g, "-");
    slug = slug.replace(/^-+|-+$/g, "");
    this.slug = slug.toLowerCase();
  }
  next();
});

// Virtual populate for sections
courseSchema.virtual("sections", {
  ref: "Section",
  localField: "_id",
  foreignField: "course",
});

// Index for search
courseSchema.index({ title: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Course", courseSchema);
