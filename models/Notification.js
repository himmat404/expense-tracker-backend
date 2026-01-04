// ============================================
// models/Notification.js
// ============================================
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['EXPENSE_ADDED', 'PAYMENT_RECEIVED', 'PAYMENT_VERIFIED', 'PAYMENT_DISPUTED', 'REMINDER', 'GROUP_INVITE'],
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId, // ID of the Expense, Group, or Payment
        required: false
    },
    relatedModel: {
        type: String,
        enum: ['Expense', 'Group', 'Payment'],
        required: false
    },
    read: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed, // Additional data like amount, group name, etc.
        default: {}
    }
}, { 
    timestamps: true 
});

// Indexes for better query performance
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });

// Auto-delete notifications older than 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('Notification', NotificationSchema);