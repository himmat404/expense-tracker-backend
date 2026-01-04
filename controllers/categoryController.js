// ============================================
// controllers/categoryController.js
// ============================================
const Category = require('../models/Category');

// @desc    Get all categories (global + user's custom)
// @route   GET /api/categories
// @access  Private
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({
            $or: [
                { createdBy: null }, // Global categories
                { createdBy: req.user._id } // User's custom categories
            ]
        }).sort('name');

        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
    try {
        const { name, icon, type } = req.body;

        if (!name || !icon) {
            return res.status(400).json({ message: 'Name and icon are required' });
        }

        const category = await Category.create({
            name,
            icon,
            type: type || 'expense',
            createdBy: req.user._id
        });

        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Only creator can update (prevent updating global categories)
        if (!category.createdBy || category.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this category' });
        }

        const { name, icon, type } = req.body;

        category.name = name || category.name;
        category.icon = icon || category.icon;
        category.type = type || category.type;

        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Only creator can delete (prevent deleting global categories)
        if (!category.createdBy || category.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this category' });
        }

        await category.deleteOne();
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Seed default categories (admin use or first-time setup)
// @route   POST /api/categories/seed
// @access  Private
const seedCategories = async (req, res) => {
    try {
        const defaultCategories = [
            { name: 'Food & Dining', icon: 'fas fa-utensils', type: 'expense' },
            { name: 'Transportation', icon: 'fas fa-car', type: 'expense' },
            { name: 'Groceries', icon: 'fas fa-shopping-cart', type: 'expense' },
            { name: 'Entertainment', icon: 'fas fa-film', type: 'expense' },
            { name: 'Utilities', icon: 'fas fa-bolt', type: 'expense' },
            { name: 'Rent', icon: 'fas fa-home', type: 'expense' },
            { name: 'Healthcare', icon: 'fas fa-medkit', type: 'expense' },
            { name: 'Shopping', icon: 'fas fa-shopping-bag', type: 'expense' },
            { name: 'Travel', icon: 'fas fa-plane', type: 'expense' },
            { name: 'Education', icon: 'fas fa-book', type: 'expense' },
            { name: 'Sports', icon: 'fas fa-football-ball', type: 'expense' },
            { name: 'Personal Care', icon: 'fas fa-spa', type: 'expense' },
            { name: 'Gifts', icon: 'fas fa-gift', type: 'expense' },
            { name: 'Insurance', icon: 'fas fa-shield-alt', type: 'expense' },
            { name: 'Other', icon: 'fas fa-ellipsis-h', type: 'expense' }
        ];

        // Check if categories already exist
        const existingCount = await Category.countDocuments({ createdBy: null });
        
        if (existingCount > 0) {
            return res.status(400).json({ message: 'Default categories already exist' });
        }

        const categories = await Category.insertMany(defaultCategories);
        res.status(201).json({ 
            message: 'Categories seeded successfully', 
            count: categories.length,
            categories 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    seedCategories
};


