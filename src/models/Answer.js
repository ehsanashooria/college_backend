const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: [true, 'محتوای پاسخ نمی تواند خالی باشد'],
        maxlength: [2000, 'پاسخ نمی تواند بیشتر از 2000 کاراکتر باشد']
    },
    isInstructorAnswer: {
        type: Boolean,
        default: false
    },
    isAccepted: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Answer', answerSchema);