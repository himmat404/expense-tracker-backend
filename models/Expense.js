// ============================================
// models/Expense.js
// ============================================
const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        default: Date.now
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', 
        required: false
    },
    type: {
        type: String,
        enum: ['EXPENSE', 'PAYMENT'], // PAYMENT = Settling up
        default: 'EXPENSE'
    },
    payer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Only for PAYMENT type
    },
    // Payment details (only for PAYMENT type)
    paymentDetails: {
        method: {
            type: String,
            enum: ['CASH', 'BANK_TRANSFER', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'VENMO', 'OTHER'],
            required: false
        },
        transactionId: {
            type: String,
            required: false,
            trim: true
        },
        remarks: {
            type: String,
            trim: true,
            maxlength: 500
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false // Person who recorded this payment (can be different from payer)
        }
    },
    // Payment verification
    verification: {
        isVerified: {
            type: Boolean,
            default: false
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verifiedAt: {
            type: Date
        },
        status: {
            type: String,
            enum: ['PENDING', 'ACCEPTED', 'DISPUTED'],
            default: 'PENDING'
        }
    },
    receiptImage: {
        type: String,
        default: null
    },
    // Splits for expenses
    splits: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false // Can be null for pending members
        },
        email: {
            type: String, // Email for pending members
            lowercase: true,
            required: false
        },
        name: {
            type: String, // Name for pending members
            required: false
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        isPending: {
            type: Boolean,
            default: false // True if this split is for a pending member
        }
    }]
}, {
    timestamps: true
});

// Indexes for better query performance
ExpenseSchema.index({ group: 1, date: -1 });
ExpenseSchema.index({ payer: 1 });
ExpenseSchema.index({ 'splits.user': 1 });
ExpenseSchema.index({ type: 1 });

// Virtual to check if expense is fully paid/verified
ExpenseSchema.virtual('isSettled').get(function() {
    if (this.type === 'PAYMENT') {
        return this.verification.isVerified;
    }
    return true; // Expenses are considered settled by default
});

module.exports = mongoose.model('Expense', ExpenseSchema);