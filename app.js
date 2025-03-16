const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
const flash = require("express-flash");
const qs = require("qs"); // Import qs for proper query parsing
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require("method-override");
const app = express();

// Middleware to parse cookies
app.use(cookieParser());

// Session configuration
app.use(
    session({
        secret: "test1234567890", // Secret key for signing session ID cookies
        resave: false, // Don't save the session if it wasn't modified
        saveUninitialized: false, // Don't create a session until needed
        cookie: {
            httpOnly: true, // Prevent JavaScript access
            secure: process.env.NODE_ENV === "production", // Secure in production
            maxAge: 1000 * 60 * 60 * 24, // 1 day expiration
        },
    })
);

// Flash messages
app.use(flash());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// 🛠 Use qs to properly parse nested query parameters (important for DataTables)
app.set("query parser", (str) => qs.parse(str));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(methodOverride("_method"));
// 🛠 Debug Middleware to Log Incoming Requests
// app.use((req, res, next) => {
//     req.query = qs.parse(req._parsedUrl.query);
//     next();
// });

app.use((req, res, next) => {
    res.locals.user = req.user || null; // ✅ Makes `user` available globally in views
    next();
  });

// Set up view engine (EJS)
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use(expressLayouts);
app.set("layout", "layout");
// Routes
app.use("/", require("./routes/homeRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/customers", require("./routes/customerRoutes"));
app.use("/users", require("./routes/userRoutes"));
app.use("/products", require("./routes/productRoutes"));
app.use("/orders", require("./routes/orderRoutes"));
app.use("/invoices", require("./routes/invoiceRoutes"));
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
