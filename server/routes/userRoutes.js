const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to protect routes
const auth = require('../middleware/auth');

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                success: false,
                error: 'User already exists with this email'
            });
        }

        // Check if username is taken
        user = await User.findOne({ name });
        if (user) {
            return res.status(400).json({
                success: false,
                error: 'Username is already taken'
            });
        }

        // Create new user
        user = new User({
            name,
            email,
            password
        });

        await user.save();

        // Create token
        const token = user.getSignedJwtToken();

        // Don't send password back
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin || false
        };

        res.status(201).json({
            success: true,
            token,
            user: userResponse
        });
    } catch (error) {
        console.error('Error registering user:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                error: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// @route   POST /api/users/login
// @desc    Login user and get token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { name, password } = req.body;

        // Validate inputs
        if (!name || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide username and password'
            });
        }

        // Check for user
        const user = await User.findOne({ name }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Create token
        const token = user.getSignedJwtToken();

        // Don't send password back
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin || false
        };

        res.status(200).json({
            success: true,
            token,
            user: userResponse
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// @route   GET /api/users/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin || false
            }
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

module.exports = router;