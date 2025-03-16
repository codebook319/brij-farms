const bcrypt = require('bcrypt');
const User = require('../models/userModel');

const login = async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
        console.log('Login request received:', { email, password });

        // Find the user by email
        const user = await User.findByEmail(email);
        if (!user) {
            console.log('User not found:', email);
            req.flash('error', 'Invalid credentials');
            return res.redirect('/auth/login');
        }

        // Compare the provided password with the hashed password
        const isMatch = await bcrypt.compare(password.trim(), user.password);
        console.log('Password comparison result:', isMatch);

        if (!isMatch) {
            console.log('Invalid password for user:', email);
            req.flash('error', 'Invalid credentials');
            return res.redirect('/auth/login');
        }

        // Store user data in the session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };

        // Extend session expiration if "Remember Me" is checked
        if (rememberMe) {
            req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7; // 1 week
        }

        // Set a cookie (optional, for additional client-side storage)
        res.cookie('userRole', user.role, { httpOnly: true });

        // Flash success message and redirect to home page
        console.log('Login successful for user:', email);
        req.flash('success', 'Logged in successfully');
        res.redirect('/');
    } catch (err) {
        console.error('Error during login:', err);
        req.flash('error', 'Something went wrong');
        res.redirect('/auth/login');
    }
};

const register = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        console.log('Registration request received:', { name, email, role, password });

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            console.log('User already exists:', email);
            req.flash('error', 'User already exists');
            return res.redirect('/auth/register');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        console.log('Password hashed successfully:', hashedPassword);

        // Create the user
        const userId = await User.create({ name, email, password: hashedPassword, role });
        console.log('User created successfully:', userId);

        // Flash success message and redirect to login page
        req.flash('success', 'Registration successful. Please log in.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error('Error during registration:', err);
        req.flash('error', 'Something went wrong');
        res.redirect('/auth/register');
    }
};

const logout = (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            req.flash('error', 'Could not log out, please try again'); // Flash error message
            return res.redirect('/');
        }

        // Clear the cookie
        res.clearCookie('userRole');

        // Flash success message and redirect to login page
        req.flash('success', 'Logged out successfully');
        res.redirect('/auth/login');
    });
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // Check if the user exists
        const user = await User.findByEmail(email);
        if (!user) {
            req.flash('error', 'User not found'); // Flash error message
            return res.redirect('/auth/forgot-password');
        }

        // TODO: Implement password reset logic (e.g., send reset link via email)
        req.flash('success', 'Password reset instructions sent to your email'); // Flash success message
        res.redirect('/auth/login');
    } catch (err) {
        req.flash('error', 'Something went wrong'); // Flash error message
        res.redirect('/auth/forgot-password');
    }
};

module.exports = { login, register, logout, forgotPassword };