const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// 🟢 Render Orders Page
router.get("/", authenticate, authorize(["superadmin", "admin"]), (req, res) => {
  res.render("orders/orders", { title: "Orders", user: req.session.user });
});

// 🟢 Render Add Order Form
router.get("/add", authenticate, authorize(["superadmin", "admin"]), orderController.showAddOrderForm);

// 🟢 Render Edit Order Form
router.get("/edit/:id", authenticate, authorize(["superadmin", "admin"]), orderController.showEditOrderForm);

// 🟢 Provide DataTables JSON Data
router.get("/data", authenticate, authorize(["superadmin", "admin"]), orderController.getAllOrders);

// 🟢 Order Management
router.post("/", authenticate, authorize(["superadmin", "admin"]), orderController.createOrder);
router.put("/:id", authenticate, authorize(["superadmin", "admin"]), orderController.updateOrder);
router.delete("/:id", authenticate, authorize(["superadmin", "admin"]), orderController.deleteOrder);
router.put("/:id/status", authenticate, authorize(["superadmin", "admin"]), orderController.toggleOrderStatus);

module.exports = router;
