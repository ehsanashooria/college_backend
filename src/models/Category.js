const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'نام دسته‌بندی الزامی است'],
        unique: true,
        trim: true,
        maxlength: [50, 'نام دسته‌بندی نمی‌تواند بیش از ۵۰ کاراکتر باشد']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        maxlength: [200, 'توضیحات نمی‌تواند بیش از ۲۰۰ کاراکتر باشد']
    },
    icon: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Generate slug before saving
categorySchema.pre('save', function (next) {
    if (this.isModified('name')) {
        let slug = String(this.name).normalize('NFC').trim();
        slug = slug.replace(/\u200c/g, '');
        slug = slug.replace(/\s+/g, '-');
        slug = slug.replace(/[^\p{L}\p{N}-]+/gu, '');
        slug = slug.replace(/-+/g, '-');
        slug = slug.replace(/^-+|-+$/g, '');
        this.slug = slug.toLowerCase();
    }
    next();
});

// Update slug before updating
categorySchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();

    if (update.name) {
        let slug = String(update.name).normalize('NFC').trim();
        slug = slug.replace(/\u200c/g, '');
        slug = slug.replace(/\s+/g, '-');
        slug = slug.replace(/[^\p{L}\p{N}-]+/gu, '');
        slug = slug.replace(/-+/g, '-');
        slug = slug.replace(/^-+|-+$/g, '');
        update.slug = slug.toLowerCase();

        this.setUpdate(update);
    }

    next();
});

module.exports = mongoose.model('Category', categorySchema);