const Product = require("../models/productModel");
const fs = require("fs");
const path = require("path");

const getAllProducts = async (req, res) => {
    try {
        const { draw, start, length, search, order } = req.query;
        const pageNumber = Math.floor(start / length) + 1;
        const pageSize = parseInt(length);
        const searchQuery = search.value;
        const sortColumn = order[0].column;
        const sortDirection = order[0].dir;

        const { products, totalRecords, filteredRecords } = await Product.getAll({
            pageNumber,
            pageSize,
            searchQuery,
            sortColumn,
            sortDirection,
        });

        res.json({
            draw: parseInt(draw),
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: products,
        });
    } catch (error) {
        console.error("❌ Error fetching products:", error);
        res.status(500).json({ error: "Error fetching products" });
    }
};


const createProduct = async (req, res) => {
    try {
        const { name, description, price, quantity, status, uom } = req.body;
        const image = req.file ? `/uploads/products/${req.file.filename}` : null;

        // 🔴 Validate required fields
        if (!name || !description || !price || !uom || !image) {
            req.flash("error", "All fields including image are required!");
            return res.redirect("/products/add");
        }

        const productQuantity = quantity ? parseInt(quantity, 10) : 1;
        const productStatus = status || "active";

        await Product.create({
            name,
            description,
            price,
            quantity: productQuantity,
            image,
            status: productStatus,
            uom,
        });

        req.flash("success", "Product added successfully!");
        res.redirect("/products");
    } catch (error) {
        console.error("❌ Error creating product:", error);
        req.flash("error", "Error creating product. Try again!");
        res.redirect("/products/add");
    }
};



const updateProduct = async (req, res) => {
    try {
        console.log(req.body);
        const productId = req.params.id;
        const { name, description, price, quantity, status, uom } = req.body;
        const image = req.file ? `/uploads/products/${req.file.filename}` : null;

        // Validate required fields
        if (!name || !description || !price || !uom) {
            req.flash("error", "All fields including uom are required!");
            return res.redirect(`/products/edit/${productId}`);
        }

        const productData = {
            name,
            description,
            price,
            quantity: quantity ? parseInt(quantity, 10) : 1,
            status: status || "active",
            uom,
        };

        // Update image only if a new one is uploaded
        if (image) {
            productData.image = image;
        }

        await Product.update(productId, productData);
        req.flash("success", "Product updated successfully!");
        res.redirect("/products");
    } catch (error) {
        console.error("❌ Error updating product:", error);
        req.flash("error", "Error updating product. Try again!");
        res.redirect(`/products/edit/${req.params.id}`);
    }
};


const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await Product.delete(id);
    res.redirect("/products");
  } catch (error) {
    res.status(500).json({ error: "Error deleting product" });
  }
};

const toggleProductStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log("🔄 Updating Product ID:", id, "to status:", status); // Debugging log

        if (!id || !status) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        // Update the product status
        const result = await Product.toggleStatus(id, status);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.redirect('/products');
    } catch (error) {
        console.error("❌ Error updating product status:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


const showAddProductForm = (req, res) => {
    res.render("products/product-add", { title: "Add Product", user: req.session.user });
  };
  
  // Show Edit Product Form
  const showEditProductForm = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.getById(productId);

        if (!product) {
            req.flash("error", "Product not found!");
            return res.redirect("/products");
        }

        res.render("products/product-edit", { title: "Edit Product",user: req.session.user, product });
    } catch (error) {
        console.error("❌ Error fetching product:", error);
        req.flash("error", "Error fetching product details!");
        res.redirect("/products");
    }
};


module.exports = {
    showAddProductForm,
    showEditProductForm,
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
  };