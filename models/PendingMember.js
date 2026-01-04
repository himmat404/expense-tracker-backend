// ============================================
// models/PendingMember.js
// ============================================
const mongoose = require('mongoose');

const PendingMemberSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    groups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],
    status: {
        type: String,
        enum: ['pending', 'registered'],
        default: 'pending'
    }
}, { 
    timestamps: true 
});

// Index for faster email lookups
PendingMemberSchema.index({ email: 1 });

module.exports = mongoose.model('PendingMember', PendingMemberSchema);