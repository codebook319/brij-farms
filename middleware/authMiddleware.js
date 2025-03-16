const authenticate = (req, res, next) => {
    console.log("🔑 [AUTH] Checking authentication...");
    if (!req.session.user) {
        console.log("❌ [AUTH] User not authenticated, redirecting...");
        req.flash('error', 'Please log in to access this page');
        return res.redirect('/auth/login');
    }
    console.log("✅ [AUTH] User authenticated!");
    next(); // Proceed if the user is authenticated
};


const authorize = (roles) => (req, res, next) => {
    console.log("🔒 [AUTH] Checking authorization...");
    console.log("👤 User Role:", req.session.user.role);
    console.log("📜 Allowed Roles:", roles);

    if (!roles.includes(req.session.user.role)) {
        console.log("❌ [AUTH] Access Denied. Redirecting...");
        req.flash('error', 'You do not have permission to access this page');
        return res.redirect('/');
    }
    console.log("✅ [AUTH] Authorization passed!");
    next(); // Proceed if the user has the required role
};



module.exports = { authenticate, authorize  };