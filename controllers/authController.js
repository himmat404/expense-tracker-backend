// ============================================
// controllers/authController.js
// ============================================
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const Group = require('../models/Group');
const PendingMember = require('../models/PendingMember');

// Helper function to convert pending member expenses (imported from groupController)
const convertPendingMemberExpenses = async (groupId, email, userId) => {
    try {
        const Expense = require('../models/Expense');
        
        // Find all expenses in this group with pending splits for this email
        const expenses = await Expense.find({
            group: groupId,
            'splits.email': email.toLowerCase(),
            'splits.isPending': true
        });

        // Update each expense
        for (const expense of expenses) {
            expense.splits = expense.splits.map(split => {
                if (split.email && split.email.toLowerCase() === email.toLowerCase() && split.isPending) {
                    return {
                        user: userId,
                        amount: split.amount,
                        isPending: false,
                        email: undefined,
                        name: undefined
                    };
                }
                return split;
            });
            await expense.save();
        }

        console.log(`✅ Converted ${expenses.length} expenses for ${email}`);
    } catch (error) {
        console.error('❌ Error converting pending member expenses:', error);
    }
};

// @desc    Register new user and convert pending memberships
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const normalizedEmail = email.toLowerCase();

        // Check if user exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword
        });

        // Check for pending invitations
        const pendingMember = await PendingMember.findOne({ 
            email: normalizedEmail 
        }).populate('groups');

        if (pendingMember && pendingMember.groups.length > 0) {
            // Convert pending memberships to actual memberships
            for (const groupId of pendingMember.groups) {
                const group = await Group.findById(groupId);
                if (group) {
                    // Remove from pending members
                    group.pendingMembers = group.pendingMembers.filter(
                        pm => pm.email.toLowerCase() !== normalizedEmail
                    );
                    
                    // Add to actual members
                    if (!group.members.includes(user._id)) {
                        group.members.push(user._id);
                    }
                    
                    await group.save();

                    // Convert expenses for this group
                    await convertPendingMemberExpenses(groupId, normalizedEmail, user._id);
                }
            }

            // Mark pending member as registered
            pendingMember.status = 'registered';
            await pendingMember.save();

            // Send response with info about converted groups
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                token: generateToken(user._id),
                message: `Welcome! You've been added to ${pendingMember.groups.length} group(s) you were invited to.`,
                convertedGroups: pendingMember.groups.length
            });
        } else {
            // Normal registration without pending invitations
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                token: generateToken(user._id)
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }

        // Check for user
        const user = await User.findOne({ email: email.toLowerCase() });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.avatar = req.body.avatar || user.avatar;

            if (req.body.password) {
                if (req.body.password.length < 6) {
                    return res.status(400).json({ message: 'Password must be at least 6 characters' });
                }
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(req.body.password, salt);
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                avatar: updatedUser.avatar,
                token: generateToken(updatedUser._id)
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search users by email
// @route   GET /api/auth/search?email=xxx
// @access  Private
const searchUsers = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: 'Email query required' });
        }

        const users = await User.find({
            email: { $regex: email, $options: 'i' },
            _id: { $ne: req.user._id } // Exclude current user
        }).select('-password').limit(10);

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    updateProfile,
    searchUsers
};