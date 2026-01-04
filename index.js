// ============================================
// index.js - Server Entry Point
// ============================================
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const os = require('os');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/imagekit', require('./routes/imagekitRoutes'));

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Expense Tracker API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            groups: '/api/groups',
            expenses: '/api/expenses',
            categories: '/api/categories',
            notifications: '/api/notifications',
            imagekit: '/api/imagekit'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Utility: Get local network IP
const getLocalIPAddress = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIPAddress();

    console.log('🚀 Server running successfully');
    console.log(`👉 Local:   http://localhost:${PORT}`);
    console.log(`👉 Network: http://${ip}:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
