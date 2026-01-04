// ============================================
// routes/expenseRoutes.js
// ============================================
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createExpense,
    getExpensesByGroup,
    getExpenseById,
    updateExpense,
    deleteExpense,
    getUserExpenses,
    settleUp,
    verifyPayment,
    getGroupPayments,
    getPaymentsBetweenUsers,
    updatePaymentRemarks
} = require('../controllers/expenseController');

// @route   POST /api/expenses
// @desc    Create a new expense
// @access  Private
router.post('/', protect, createExpense);

// @route   GET /api/expenses/user/all
// @desc    Get user's expenses across all groups
// @access  Private
router.get('/user/all', protect, getUserExpenses);

// @route   POST /api/expenses/settle
// @desc    Settle up - Record payment between users
// @access  Private
router.post('/settle', protect, settleUp);

// @route   GET /api/expenses/payments/between
// @desc    Get payment history between two users
// @access  Private
router.get('/payments/between', protect, getPaymentsBetweenUsers);

// @route   GET /api/expenses/group/:groupId
// @desc    Get all expenses for a group
// @access  Private
router.get('/group/:groupId', protect, getExpensesByGroup);

// @route   GET /api/expenses/group/:groupId/payments
// @desc    Get all payments in a group
// @access  Private
router.get('/group/:groupId/payments', protect, getGroupPayments);

// @route   GET /api/expenses/:id
// @desc    Get single expense by ID
// @access  Private
router.get('/:id', protect, getExpenseById);

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private
router.put('/:id', protect, updateExpense);

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private
router.delete('/:id', protect, deleteExpense);

// @route   PUT /api/expenses/:id/verify
// @desc    Verify/Accept a payment
// @access  Private
router.put('/:id/verify', protect, verifyPayment);

// @route   PUT /api/expenses/:id/remarks
// @desc    Update payment remarks
// @access  Private
router.put('/:id/remarks', protect, updatePaymentRemarks);

module.exports = router;