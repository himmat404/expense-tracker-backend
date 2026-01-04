// ============================================
// routes/categoryRoutes.js
// ============================================
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    seedCategories
} = require('../controllers/categoryController');

// @route   GET /api/categories
// @desc    Get all categories (global + user's custom)
// @access  Private
router.get('/', protect, getCategories);

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private
router.post('/', protect, createCategory);

// @route   POST /api/categories/seed
// @desc    Seed default categories
// @access  Private
router.post('/seed', protect, seedCategories);

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private
router.put('/:id', protect, updateCategory);

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private
router.delete('/:id', protect, deleteCategory);

module.exports = router;