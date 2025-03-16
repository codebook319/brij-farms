const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/invoiceController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

router.get("/", authenticate, authorize(["superadmin", "admin"]), (req, res) => {

  res.render("invoices/invoices", { title: "invoices", user: req.session.user });
});
// 🟢 Render Invoices Page
// router.get("/", authenticate, authorize(["superadmin", "admin"]), invoiceController.showInvoices);

// 🟢 Generate Invoice for a Single Customer
router.post("/generate/:customerId", authenticate, authorize(["superadmin", "admin"]), invoiceController.generateInvoice);

// 🟢 Generate Invoices for All Customers (Monthly Basis)
router.post("/generate-all", authenticate, authorize(["superadmin", "admin"]), invoiceController.generateAllInvoices);

// 🟢 View Invoice Details
 router.get("/view/:invoiceId", authenticate, authorize(["superadmin", "admin"]), invoiceController.viewInvoice);

// 🟢 Download Invoice as PDF
router.get("/:invoiceId/download", authenticate, authorize(["superadmin", "admin"]), invoiceController.downloadInvoice);

router.get("/data", authenticate, authorize(["superadmin", "admin"]), invoiceController.getAllInvoices);

router.put("/approve/:invoiceId", authenticate, authorize(["superadmin", "admin"]), invoiceController.approveInvoice);
// Other routes for invoice operations
router.get("/download/:id",authenticate, authorize(["superadmin", "admin"]),  invoiceController.downloadInvoice);
router.delete("/delete/:invoiceId", authenticate, authorize(["superadmin", "admin"]), invoiceController.deleteInvoice);

module.exports = router;
