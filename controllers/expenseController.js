// ============================================
// controllers/expenseController.js
// ============================================
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Create expense with pending member support
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
    try {
        const { description, amount, date, group, category, type, splits, receiptImage } = req.body;

        // Validation
        if (!description || !amount || !group || !splits || splits.length === 0) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Check if group exists and user is a member
        const groupDoc = await Group.findById(group);
        if (!groupDoc) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (!groupDoc.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to add expenses to this group' });
        }

        // Validate splits sum
        const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
        if (Math.abs(totalSplits - amount) > 0.01) {
            return res.status(400).json({ message: 'Splits must sum up to total amount' });
        }

        // Process splits - handle both registered users and pending members
        const processedSplits = splits.map(split => {
            if (split.user) {
                // Registered user
                return {
                    user: split.user,
                    amount: split.amount,
                    isPending: false
                };
            } else if (split.email) {
                // Pending member
                return {
                    email: split.email.toLowerCase(),
                    name: split.name || 'Unknown',
                    amount: split.amount,
                    isPending: true
                };
            } else {
                throw new Error('Split must have either userId or email');
            }
        });

        // Create expense
        const expense = await Expense.create({
            description,
            amount,
            date: date || Date.now(),
            group,
            category: category || null,
            type: type || 'EXPENSE',
            payer: req.user._id,
            splits: processedSplits,
            receiptImage: receiptImage || null
        });

        const populatedExpense = await Expense.findById(expense._id)
            .populate('payer', 'name email avatar')
            .populate('splits.user', 'name email avatar')
            .populate('category', 'name icon')
            .populate('group', 'name');

        // Create notifications for involved users (excluding payer)
        const notifications = splits
            .filter(split => split.user && split.user.toString() !== req.user._id.toString())
            .map(split => ({
                recipient: split.user,
                sender: req.user._id,
                type: 'EXPENSE_ADDED',
                message: `${req.user.name} added "${description}" - you owe ${split.amount}`,
                relatedId: expense._id,
                metadata: { amount: split.amount, groupName: groupDoc.name }
            }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.status(201).json(populatedExpense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get expenses for a group
// @route   GET /api/expenses/group/:groupId
// @access  Private
const getExpensesByGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (!group.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const expenses = await Expense.find({ group: req.params.groupId })
            .populate('payer', 'name email avatar')
            .populate('receiver', 'name email avatar')
            .populate('splits.user', 'name email avatar')
            .populate('category', 'name icon')
            .populate('paymentDetails.recordedBy', 'name email')
            .populate('verification.verifiedBy', 'name email')
            .sort('-date');

        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
const getExpenseById = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id)
            .populate('payer', 'name email avatar')
            .populate('receiver', 'name email avatar')
            .populate('splits.user', 'name email avatar')
            .populate('category', 'name icon')
            .populate('group', 'name members')
            .populate('paymentDetails.recordedBy', 'name email')
            .populate('verification.verifiedBy', 'name email');

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        // Check if user is a group member
        if (!expense.group.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(expense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        // Only payer can update
        if (expense.payer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this expense' });
        }

        const { description, amount, date, category, splits, receiptImage } = req.body;

        // Validate splits if provided
        if (splits) {
            const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
            const newAmount = amount || expense.amount;
            if (Math.abs(totalSplits - newAmount) > 0.01) {
                return res.status(400).json({ message: 'Splits must sum up to total amount' });
            }
        }

        expense.description = description || expense.description;
        expense.amount = amount || expense.amount;
        expense.date = date || expense.date;
        expense.category = category !== undefined ? category : expense.category;
        expense.splits = splits || expense.splits;
        expense.receiptImage = receiptImage !== undefined ? receiptImage : expense.receiptImage;

        const updatedExpense = await expense.save();

        const populatedExpense = await Expense.findById(updatedExpense._id)
            .populate('payer', 'name email avatar')
            .populate('receiver', 'name email avatar')
            .populate('splits.user', 'name email avatar')
            .populate('category', 'name icon')
            .populate('group', 'name');

        res.json(populatedExpense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        // Only payer can delete
        if (expense.payer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this expense' });
        }

        await expense.deleteOne();

        res.json({ message: 'Expense deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user's expenses across all groups
// @route   GET /api/expenses/user/all
// @access  Private
const getUserExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find({
            $or: [
                { payer: req.user._id },
                { 'splits.user': req.user._id }
            ]
        })
            .populate('payer', 'name email avatar')
            .populate('receiver', 'name email avatar')
            .populate('splits.user', 'name email avatar')
            .populate('category', 'name icon')
            .populate('group', 'name')
            .populate('paymentDetails.recordedBy', 'name email')
            .sort('-date')
            .limit(50);

        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Settle up - Record payment between any two group members
// @route   POST /api/expenses/settle
// @access  Private
const settleUp = async (req, res) => {
    try {
        const { 
            group, 
            payer,      // Who is paying
            receiver,   // Who is receiving
            amount, 
            paymentMethod, 
            transactionId, 
            remarks,
            date,
            receiptImage 
        } = req.body;

        // Validation
        if (!group || !payer || !receiver || !amount) {
            return res.status(400).json({ 
                message: 'Please provide group, payer, receiver, and amount' 
            });
        }

        if (payer === receiver) {
            return res.status(400).json({ 
                message: 'Payer and receiver cannot be the same person' 
            });
        }

        // Check group membership
        const groupDoc = await Group.findById(group).populate('members');
        if (!groupDoc) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if current user is a member
        if (!groupDoc.members.some(m => m._id.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Not authorized - not a group member' });
        }

        // Check if payer and receiver are group members
        const payerIsMember = groupDoc.members.some(m => m._id.toString() === payer);
        const receiverIsMember = groupDoc.members.some(m => m._id.toString() === receiver);

        if (!payerIsMember || !receiverIsMember) {
            return res.status(400).json({ 
                message: 'Both payer and receiver must be group members' 
            });
        }

        // Get payer name for description
        const payerUser = await User.findById(payer);
        const receiverUser = await User.findById(receiver);

        // Create payment record
        const payment = await Expense.create({
            description: `Payment: ${payerUser.name} → ${receiverUser.name}`,
            amount,
            date: date || Date.now(),
            group,
            type: 'PAYMENT',
            payer: payer,
            receiver: receiver,
            paymentDetails: {
                method: paymentMethod || 'OTHER',
                transactionId: transactionId || null,
                remarks: remarks || null,
                recordedBy: req.user._id // Person who recorded this payment
            },
            verification: {
                isVerified: false,
                status: 'PENDING'
            },
            receiptImage: receiptImage || null,
            splits: [{
                user: receiver,
                amount: amount
            }]
        });

        const populatedPayment = await Expense.findById(payment._id)
            .populate('payer', 'name email avatar')
            .populate('receiver', 'name email avatar')
            .populate('paymentDetails.recordedBy', 'name email avatar')
            .populate('splits.user', 'name email avatar')
            .populate('group', 'name');

        // Create notifications
        const notifications = [];

        // Notify receiver
        notifications.push({
            recipient: receiver,
            sender: req.user._id,
            type: 'PAYMENT_RECEIVED',
            message: `${payerUser.name} paid you ${amount}${remarks ? ` - ${remarks}` : ''}`,
            relatedId: payment._id,
            relatedModel: 'Payment',
            metadata: { amount, payerName: payerUser.name, groupName: groupDoc.name }
        });

        // If recorder is different from payer, notify payer too
        if (req.user._id.toString() !== payer) {
            notifications.push({
                recipient: payer,
                sender: req.user._id,
                type: 'PAYMENT_RECEIVED',
                message: `${req.user.name} recorded a payment you made to ${receiverUser.name} - ${amount}`,
                relatedId: payment._id,
                relatedModel: 'Payment',
                metadata: { amount, receiverName: receiverUser.name }
            });
        }

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.status(201).json(populatedPayment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify/Accept a payment
// @route   PUT /api/expenses/:id/verify
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const { status } = req.body; // 'ACCEPTED' or 'DISPUTED'

        const payment = await Expense.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        if (payment.type !== 'PAYMENT') {
            return res.status(400).json({ message: 'This is not a payment record' });
        }

        // Only the receiver can verify the payment
        if (payment.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ 
                message: 'Only the payment receiver can verify this payment' 
            });
        }

        payment.verification.isVerified = status === 'ACCEPTED';
        payment.verification.verifiedBy = req.user._id;
        payment.verification.verifiedAt = Date.now();
        payment.verification.status = status || 'ACCEPTED';

        await payment.save();

        const populatedPayment = await Expense.findById(payment._id)
            .populate('payer', 'name email avatar')
            .populate('receiver', 'name email avatar')
            .populate('paymentDetails.recordedBy', 'name email avatar')
            .populate('verification.verifiedBy', 'name email avatar')
            .populate('group', 'name');

        // Notify payer about verification
        await Notification.create({
            recipient: payment.payer,
            sender: req.user._id,
            type: status === 'ACCEPTED' ? 'PAYMENT_VERIFIED' : 'PAYMENT_DISPUTED',
            message: status === 'ACCEPTED' 
                ? `${req.user.name} confirmed receiving your payment of ${payment.amount}`
                : `${req.user.name} disputed the payment of ${payment.amount}`,
            relatedId: payment._id,
            relatedModel: 'Payment',
            metadata: { amount: payment.amount, status }
        });

        res.json(populatedPayment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all payments in a group
// @route   GET /api/expenses/group/:groupId/payments
// @access  Private
const getGroupPayments = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (!group.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const payments = await Expense.find({ 
            group: req.params.groupId,
            type: 'PAYMENT'
        })
            .populate('payer', 'name email avatar')
            .populate('receiver', 'name email avatar')
            .populate('paymentDetails.recordedBy', 'name email avatar')
            .populate('verification.verifiedBy', 'name email avatar')
            .sort('-date');

        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get payment history between two users
// @route   GET /api/expenses/payments/between?user1=xxx&user2=xxx&group=xxx
// @access  Private
const getPaymentsBetweenUsers = async (req, res) => {
    try {
        const { user1, user2, group } = req.query;

        if (!user1 || !user2) {
            return res.status(400).json({ 
                message: 'Please provide both user IDs' 
            });
        }

        const query = {
            type: 'PAYMENT',
            $or: [
                { payer: user1, receiver: user2 },
                { payer: user2, receiver: user1 }
            ]
        };

        if (group) {
            query.group = group;
        }

        const payments = await Expense.find(query)
            .populate('payer', 'name email avatar')
            .populate('receiver', 'name email avatar')
            .populate('paymentDetails.recordedBy', 'name email avatar')
            .populate('verification.verifiedBy', 'name email avatar')
            .populate('group', 'name')
            .sort('-date');

        // Calculate net amount
        let netAmount = 0;
        payments.forEach(payment => {
            if (payment.payer.toString() === user1) {
                netAmount += payment.amount;
            } else {
                netAmount -= payment.amount;
            }
        });

        res.json({
            payments,
            summary: {
                totalPayments: payments.length,
                netAmount: Math.round(netAmount * 100) / 100,
                netDirection: netAmount > 0 
                    ? `User 1 has paid ${Math.abs(netAmount)} more` 
                    : `User 2 has paid ${Math.abs(netAmount)} more`
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update payment remarks
// @route   PUT /api/expenses/:id/remarks
// @access  Private
const updatePaymentRemarks = async (req, res) => {
    try {
        const { remarks } = req.body;
        const payment = await Expense.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        if (payment.type !== 'PAYMENT') {
            return res.status(400).json({ message: 'This is not a payment record' });
        }

        // Check if user is involved in the payment (payer, receiver, or recorder)
        const isInvolved = 
            payment.payer.toString() === req.user._id.toString() ||
            payment.receiver.toString() === req.user._id.toString() ||
            (payment.paymentDetails.recordedBy && 
             payment.paymentDetails.recordedBy.toString() === req.user._id.toString());

        if (!isInvolved) {
            return res.status(403).json({ 
                message: 'Not authorized to update this payment' 
            });
        }

        payment.paymentDetails.remarks = remarks;
        await payment.save();

        const populatedPayment = await Expense.findById(payment._id)
            .populate('payer', 'name email avatar')
            .populate('receiver', 'name email avatar')
            .populate('paymentDetails.recordedBy', 'name email avatar');

        res.json(populatedPayment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
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
};
