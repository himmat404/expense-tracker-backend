// ============================================
// controllers/groupController.js
// ============================================
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const User = require('../models/User');
const PendingMember = require('../models/PendingMember');
const Notification = require('../models/Notification');

// Helper function to convert pending member expenses
const convertPendingMemberExpenses = async (groupId, email, userId) => {
    try {
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

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
    try {
        const { name, currency, members, icon, image } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Group name is required' });
        }

        // Create group with creator as first member
        const group = await Group.create({
            name,
            currency: currency || 'USD',
            icon: icon || null,
            image: image || null,
            members: [req.user._id, ...(members || [])],
            createdBy: req.user._id
        });

        const populatedGroup = await Group.findById(group._id)
            .populate('members', 'name email avatar')
            .populate('createdBy', 'name email');

        res.status(201).json(populatedGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all groups for logged-in user
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id })
            .populate('members', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('pendingMembers.invitedBy', 'name email')
            .sort('-createdAt');

        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single group by ID
// @route   GET /api/groups/:id
// @access  Private
const getGroupById = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('members', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('pendingMembers.invitedBy', 'name email');

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is a member
        if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Not authorized to view this group' });
        }

        res.json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private
const updateGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is creator
        if (group.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this group' });
        }

        const { name, currency, icon, image } = req.body;

        group.name = name || group.name;
        group.currency = currency || group.currency;
        group.icon = icon !== undefined ? icon : group.icon;
        group.image = image !== undefined ? image : group.image;

        const updatedGroup = await group.save();
        const populatedGroup = await Group.findById(updatedGroup._id)
            .populate('members', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('pendingMembers.invitedBy', 'name email');

        res.json(populatedGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add member to group (existing user or pending)
// @route   POST /api/groups/:id/members
// @access  Private
// REPLACE addMember function in groupController.js

const addMember = async (req, res) => {
    try {
        const { userId, email, name } = req.body;
        
        console.log('📥 Add member request:', { userId, email, name, groupId: req.params.id });
        
        const group = await Group.findById(req.params.id);

        if (!group) {
            console.error('❌ Group not found:', req.params.id);
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if requester is a member
        if (!group.members.includes(req.user._id)) {
            console.error('❌ User not authorized:', req.user._id);
            return res.status(403).json({ message: 'Not authorized' });
        }

        let addedUserId = null;

        // Case 1: Adding existing user by userId
        if (userId) {
            console.log('🔍 Looking up user:', userId);
            
            const user = await User.findById(userId);
            if (!user) {
                console.error('❌ User not found:', userId);
                return res.status(404).json({ message: 'User not found' });
            }

            console.log('✅ Found user:', user.name, user.email);

            // Check if user is already a member
            if (group.members.some(m => m.toString() === userId)) {
                console.log('⚠️ User already a member');
                return res.status(400).json({ message: 'User is already a member' });
            }

            group.members.push(userId);
            await group.save();
            addedUserId = userId;

            console.log('✅ Added user to group');

            // Convert pending expenses
            try {
                await convertPendingMemberExpenses(group._id, user.email, userId);
            } catch (error) {
                console.error('⚠️ Error converting expenses:', error.message);
            }

            // Create notification
            try {
                await Notification.create({
                    recipient: userId,
                    sender: req.user._id,
                    type: 'GROUP_INVITE',
                    message: `${req.user.name} added you to group "${group.name}"`,
                    relatedId: group._id,
                    relatedModel: 'Group',
                    metadata: { groupName: group.name }
                });
                console.log('✅ Notification created');
            } catch (error) {
                console.error('⚠️ Error creating notification:', error.message);
            }
        } 
        // Case 2: Adding pending member by email
        else if (email && name) {
            console.log('📧 Adding pending member:', email);
            
            // Check if user already exists with this email
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            
            if (existingUser) {
                console.log('✅ Found existing user for email:', existingUser.name);
                
                // If user exists, add them directly
                if (group.members.some(m => m.toString() === existingUser._id.toString())) {
                    return res.status(400).json({ message: 'User is already a member' });
                }
                
                group.members.push(existingUser._id);
                addedUserId = existingUser._id;

                // Create notification
                try {
                    await Notification.create({
                        recipient: existingUser._id,
                        sender: req.user._id,
                        type: 'GROUP_INVITE',
                        message: `${req.user.name} added you to group "${group.name}"`,
                        relatedId: group._id,
                        relatedModel: 'Group',
                        metadata: { groupName: group.name }
                    });
                } catch (error) {
                    console.error('⚠️ Error creating notification:', error.message);
                }
            } else {
                // Check if already in pending members
                const alreadyPending = group.pendingMembers.some(
                    pm => pm.email.toLowerCase() === email.toLowerCase()
                );
                
                if (alreadyPending) {
                    console.log('⚠️ Email already in pending members');
                    return res.status(400).json({ message: 'User is already invited' });
                }

                // Add to pending members
                group.pendingMembers.push({
                    email: email.toLowerCase(),
                    name,
                    invitedBy: req.user._id,
                    invitedAt: Date.now()
                });

                // Create/Update PendingMember record
                try {
                    await PendingMember.findOneAndUpdate(
                        { email: email.toLowerCase() },
                        {
                            email: email.toLowerCase(),
                            name,
                            invitedBy: req.user._id,
                            $addToSet: { groups: group._id }
                        },
                        { upsert: true, new: true }
                    );
                    console.log('✅ Pending member record created');
                } catch (error) {
                    console.error('⚠️ Error creating pending member:', error.message);
                }
            }

            await group.save();
            console.log('✅ Group saved');
        } else {
            console.error('❌ Invalid request body');
            return res.status(400).json({ 
                message: 'Please provide either userId or both email and name' 
            });
        }

        const populatedGroup = await Group.findById(group._id)
            .populate('members', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('pendingMembers.invitedBy', 'name email');

        console.log('✅ Member added successfully');
        res.json(populatedGroup);
        
    } catch (error) {
        console.error('❌ Error in addMember:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            message: error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Remove member from group
// @route   DELETE /api/groups/:id/members/:userId
// @access  Private
const removeMember = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Only creator can remove members or user can remove themselves
        if (group.createdBy.toString() !== req.user._id.toString() && 
            req.params.userId !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        group.members = group.members.filter(
            member => member.toString() !== req.params.userId
        );

        await group.save();

        const populatedGroup = await Group.findById(group._id)
            .populate('members', 'name email avatar')
            .populate('createdBy', 'name email')
            .populate('pendingMembers.invitedBy', 'name email');

        res.json(populatedGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private
const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Only creator can delete
        if (group.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this group' });
        }

        // Delete all expenses in this group
        await Expense.deleteMany({ group: req.params.id });

        await group.deleteOne();

        res.json({ message: 'Group and associated expenses deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get group balances (including pending members)
// @route   GET /api/groups/:id/balances
// @access  Private
const getGroupBalances = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is a member
        if (!group.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const expenses = await Expense.find({ 
            group: req.params.id,
            type: 'EXPENSE'
        }).populate('payer', 'name email');

        // Calculate balances
        const balances = {};
        const pendingBalances = {};
        
        // Initialize balances for all members
        group.members.forEach(member => {
            balances[member.toString()] = 0;
        });

        // Initialize balances for pending members
        group.pendingMembers.forEach(pm => {
            pendingBalances[pm.email] = { 
                balance: 0, 
                email: pm.email, 
                name: pm.name,
                isPending: true 
            };
        });

        // Calculate who owes what
        expenses.forEach(expense => {
            const payerId = expense.payer._id.toString();
            
            expense.splits.forEach(split => {
                if (split.isPending && split.email) {
                    // Handle pending member split
                    const email = split.email.toLowerCase();
                    if (!pendingBalances[email]) {
                        pendingBalances[email] = { 
                            balance: 0, 
                            email, 
                            name: split.name,
                            isPending: true 
                        };
                    }
                    pendingBalances[email].balance -= split.amount;
                    balances[payerId] += split.amount;
                } else if (split.user) {
                    // Handle registered user split
                    const userId = split.user.toString();
                    if (userId !== payerId) {
                        balances[userId] -= split.amount;
                        balances[payerId] += split.amount;
                    }
                }
            });
        });

        // Get user details for registered members
        const populatedBalances = await Promise.all(
            Object.entries(balances).map(async ([userId, amount]) => {
                const user = await User.findById(userId).select('name email avatar');
                return {
                    user,
                    balance: Math.round(amount * 100) / 100,
                    isPending: false
                };
            })
        );

        // Add pending members to balances
        const allBalances = [
            ...populatedBalances,
            ...Object.values(pendingBalances).map(pb => ({
                user: { name: pb.name, email: pb.email },
                balance: Math.round(pb.balance * 100) / 100,
                isPending: true
            }))
        ];

        res.json(allBalances);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createGroup,
    getGroups,
    getGroupById,
    updateGroup,
    addMember,
    removeMember,
    deleteGroup,
    getGroupBalances,
    convertPendingMemberExpenses
};