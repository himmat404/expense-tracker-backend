// ============================================
// routes/imagekitRoutes.js
// ============================================
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const imagekit = require('../utils/imagekit');

// @route   GET /api/imagekit/auth
// @desc    Get ImageKit authentication parameters
// @access  Private
router.get('/auth', protect, (req, res) => {
    try {
        const authenticationParameters = imagekit.getAuthenticationParameters();
        res.json(authenticationParameters);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;