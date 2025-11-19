const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    comment: {
        type: String,
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    // Review status
    isPublished: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index - one review per student per course
reviewSchema.index({ student: 1, course: 1 }, { unique: true });

// Update course average rating after save
reviewSchema.post('save', async function () {
    const Course = mongoose.model('Course');
    const stats = await this.constructor.aggregate([
        { $match: { course: this.course } },
        {
            $group: {
                _id: '$course',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        await Course.findByIdAndUpdate(this.course, {
            averageRating: Math.round(stats[0].averageRating * 10) / 10,
            totalReviews: stats[0].totalReviews
        });
    }
});

module.exports = mongoose.model('Review', reviewSchema);