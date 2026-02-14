const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true
    },
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
    title: {
        type: String,
        required: [true, 'عنوان سوال الزامی است'],
        trim: true,
        maxlength: [200, 'عنوان سوال نمی تواند بیشتر از 200 کاراکتر باشد']
    },
    content: {
        type: String,
        required: [true, 'محتوای سوال الزامی است'],
        maxlength: [2000, 'محتوای سوال نمی تواند بیشتر از 2000 کاراکتر باشد']
    },
    // Question status
    isAnswered: {
        type: Boolean,
        default: false
    },
    answeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    answeredAt: {
        type: Date
    },
    totalAnswers: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for answers
questionSchema.virtual('answers', {
    ref: 'Answer',
    localField: '_id',
    foreignField: 'question'
});

module.exports = mongoose.model('Question', questionSchema);