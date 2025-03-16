const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Render login page
router.get('/login', (req, res) => {
    const messages = {
        error: req.flash('error'),
        success: req.flash('success'),
    };
    res.render('auth/login', { layout: false, messages });
});

// Handle login form submission
router.post('/login', authController.login);

// Render registration page
router.get('/register', (req, res) => {
    const messages = {
        error: req.flash('error'),
        success: req.flash('success'),
    };
    res.render('auth/register', { layout: false, messages });
});

// Handle registration form submission
router.post('/register', authController.register);

// Render forgot password page
router.get('/forgot-password', (req, res) => {
    const messages = {
        error: req.flash('error'),
        success: req.flash('success'),
    };
    res.render('auth/forgot-password', { layout: false, messages });
});

// Handle forgot password form submission
router.post('/forgot-password', authController.forgotPassword);

// Handle logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error during logout:', err);
        return res.redirect('/');
      }
      res.redirect('/auth/login'); // Redirect to the login page after logout
    });
  });

module.exports = router;