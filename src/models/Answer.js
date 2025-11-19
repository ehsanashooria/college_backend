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
        required: [true, 'Answer content is required'],
        maxlength: [2000, 'Content cannot exceed 2000 characters']
    },
    isInstructorAnswer: {
        type: Boolean,
        default: false
    },
    isAccepted: {
        type: Boolean,
        default: false
    },
    // Engagement
    upvotes: {
        type: Number,
        default: 0
    },
    upvotedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Answer', answerSchema);