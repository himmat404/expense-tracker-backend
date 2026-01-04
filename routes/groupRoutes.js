// ============================================
// routes/groupRoutes.js
// ============================================
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createGroup,
    getGroups,
    getGroupById,
    updateGroup,
    addMember,
    removeMember,
    deleteGroup,
    getGroupBalances
} = require('../controllers/groupController');

// @route   POST /api/groups
// @desc    Create a new group
// @access  Private
router.post('/', protect, createGroup);

// @route   GET /api/groups
// @desc    Get all groups for logged-in user
// @access  Private
router.get('/', protect, getGroups);

// @route   GET /api/groups/:id
// @desc    Get single group by ID
// @access  Private
router.get('/:id', protect, getGroupById);

// @route   PUT /api/groups/:id
// @desc    Update group details
// @access  Private
router.put('/:id', protect, updateGroup);

// @route   POST /api/groups/:id/members
// @desc    Add member to group (existing user or pending)
// @access  Private
router.post('/:id/members', protect, addMember);

// @route   DELETE /api/groups/:id/members/:userId
// @desc    Remove member from group
// @access  Private
router.delete('/:id/members/:userId', protect, removeMember);

// @route   DELETE /api/groups/:id
// @desc    Delete group
// @access  Private
router.delete('/:id', protect, deleteGroup);

// @route   GET /api/groups/:id/balances
// @desc    Get group balances (including pending members)
// @access  Private
router.get('/:id/balances', protect, getGroupBalances);

module.exports = router;