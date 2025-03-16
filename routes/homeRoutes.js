const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');

// Home route
router.get('/', authenticate, (req, res) => {
    res.render('home', { title: 'Home', user: req.session.user });
});

module.exports = router;