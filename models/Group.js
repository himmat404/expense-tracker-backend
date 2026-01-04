// ============================================
// models/Group.js
// ============================================
const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    currency: {
        type: String,
        default: "USD",
        uppercase: true
    },
    icon: {
        type: String,
        default: null  // Store icon name (e.g., 'fas fa-users') or emoji
    },
    image: {
        type: String,
        default: null  // Store ImageKit URL for group cover image
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    pendingMembers: [{
        email: {
            type: String,
            required: true,
            lowercase: true
        },
        name: {
            type: String,
            required: true
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        invitedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for faster member lookups
GroupSchema.index({ members: 1 });

module.exports = mongoose.model('Group', GroupSchema);