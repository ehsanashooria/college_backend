const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Section title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    order: {
        type: Number,
        required: true,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for lessons
sectionSchema.virtual('lessons', {
    ref: 'Lesson',
    localField: '_id',
    foreignField: 'section'
});

module.exports = mongoose.model('Section', sectionSchema);