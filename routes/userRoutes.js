const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// 🟢 Render Users Page (Now at `/users`)
router.get("/", authenticate, authorize(["superadmin", "admin"]), (req, res) => {
  res.render("users/users", { title: "Users", user: req.session.user  }); // ✅ Pass user to EJS
});


// 🟢 Provide DataTables JSON Data (Now at `/users/data`)
router.get("/data", authenticate, authorize(["superadmin", "admin"]), userController.getAllUsers);

router.post("/", authenticate, authorize(["superadmin"]), userController.createUser);
router.put("/:id", authenticate, authorize(["superadmin"]), userController.updateUser);
router.delete("/:id", authenticate, authorize(["superadmin"]), userController.deleteUser);

router.put("/:id/status", authenticate, authorize(["superadmin"]), userController.toggleUserStatus);

module.exports = router;
