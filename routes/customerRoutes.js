const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// 🟢 Render Customers Page
router.get("/", authenticate, authorize(["superadmin", "admin"]), (req, res) => {
  res.render("customers/customers", { title: "Customers", user: req.session.user });
});

// 🟢 Render Add Customer Form
router.get("/add", authenticate, authorize(["superadmin", "admin"]), customerController.showAddCustomerForm);

// 🟢 Render Edit Customer Form
router.get("/edit/:id", authenticate, authorize(["superadmin", "admin"]), customerController.showEditCustomerForm);

// 🟢 Provide DataTables JSON Data
router.get("/data", authenticate, authorize(["superadmin", "admin"]), customerController.getAllCustomers);

// 🟢 Customer Management
router.post("/", authenticate, authorize(["superadmin","admin"]), customerController.createCustomer);
router.put("/:id", authenticate, authorize(["superadmin","admin"]), customerController.updateCustomer);
router.delete("/:id", authenticate, authorize(["superadmin","admin"]), customerController.deleteCustomer);
router.put("/:id/status", authenticate, authorize(["superadmin","admin"]), customerController.toggleCustomerStatus);

module.exports = router;
