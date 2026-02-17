const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'فیلد نام اجباری است'],
    trim: true,
    maxlength: [50, 'نام نمی‌تواند بیش از ۵۰ کاراکتر باشد']
  },
  lastName: {
    type: String,
    required: [true, 'فیلد نام خانوادگی اجباری است'],
    trim: true,
    maxlength: [50, 'نام خانوادگی نمی‌تواند بیش از ۵۰ کاراکتر باشد']
  },
  email: {
    type: String,
    required: [true, 'فیلد ایمیل اجباری است'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'لطفاً یک ایمیل معتبر وارد کنید']
  },
  password: {
    type: String,
    required: [true, 'فیلد رمز عبور اجباری است'],
    minlength: [6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'بیوگرافی نمی‌تواند بیش از ۵۰۰ کاراکتر باشد']
  },
  // For instructors
  expertise: [{
    type: String
  }],
  // Statistics
  totalCoursesCreated: {
    type: Number,
    default: 0
  },
  totalStudentsEnrolled: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  tokenVersion: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);