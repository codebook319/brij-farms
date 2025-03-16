const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
// 🟢 Render Products Page
router.get("/", authenticate, authorize(["superadmin", "admin"]), (req, res) => {
  res.render("products/products", { title: "Products", user: req.session.user });
});

router.get("/add", authenticate, authorize(["superadmin", "admin"]), productController.showAddProductForm);

// 🟢 Render Edit Product Form
router.get("/edit/:id", authenticate, authorize(["superadmin", "admin"]), productController.showEditProductForm);

// 🟢 Provide DataTables JSON Data
router.get("/data", authenticate, authorize(["superadmin", "admin"]), productController.getAllProducts);

// 🟢 Product Management
router.post("/", authenticate, authorize(["superadmin", "admin"]), upload.single("image"), productController.createProduct);

router.put("/:id", authenticate, authorize(["superadmin", "admin"]), upload.single("image"), productController.updateProduct);
router.delete("/:id", authenticate, authorize(["superadmin", "admin"]), productController.deleteProduct);
router.put("/:id/status", authenticate, authorize(["superadmin", "admin"]), productController.toggleProductStatus);



module.exports = router;
