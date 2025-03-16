const express = require('express');
const router = express.Router();

// Home Page
router.get('/', (req, res) => {
  res.render('home', {
    title: 'Home',
    user: req.session.user, // Pass the logged-in user data
  });
});

module.exports = router;