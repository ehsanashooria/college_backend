
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Course title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        required: [true, 'Course description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    shortDescription: {
        type: String,
        maxlength: [300, 'Short description cannot exceed 300 characters']
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    }],
    thumbnail: {
        type: String,
        default: null
    },
    previewVideo: {
        type: String,
        default: null
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
        default: 'all-levels'
    },
    price: {
        type: Number,
        required: [true, 'Course price is required'],
        min: [0, 'Price cannot be negative'],
        default: 0
    },
    discountPrice: {
        type: Number,
        min: [0, 'Discount price cannot be negative'],
        default: null
    },
    tags: [{
        type: String,
        trim: true
    }],
    whatYouWillLearn: [{
        type: String,
        trim: true
    }],
    // Course Statistics
    totalDuration: {
        type: Number, // in minutes
        default: 0
    },
    totalLessons: {
        type: Number,
        default: 0
    },
    totalEnrollments: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    // Course Status
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    publishedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Generate slug before saving
courseSchema.pre('save', function (next) {
    if (this.isModified('title')) {
        this.slug = this.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    }
    next();
});

// Virtual populate for sections
courseSchema.virtual('sections', {
    ref: 'Section',
    localField: '_id',
    foreignField: 'course'
});

// Index for search
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Course', courseSchema);