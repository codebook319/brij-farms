const express = require('express');
const router = express.Router();
const User = require('../models/userModel');

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.getAll();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new user
router.post('/users', async (req, res) => {
    try {
        const id = await User.create(req.body);
        res.status(201).json({ id });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;