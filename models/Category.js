// ============================================
// models/Category.js
// ============================================
const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    icon: {
        type: String, // Store icon name (e.g., 'fas fa-pizza-slice') or URL
        required: true
    },
    type: {
        type: String,
        enum: ['expense', 'income'],
        default: 'expense'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // null for global categories, userId for user-specific
    }
}, { 
    timestamps: true 
});

// Index for faster queries
CategorySchema.index({ type: 1, createdBy: 1 });

module.exports = mongoose.model('Category', CategorySchema);