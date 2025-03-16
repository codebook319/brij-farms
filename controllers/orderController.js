const Order = require("../models/orderModel");
const Customer = require("../models/customerModel");
const Product = require("../models/productModel");
const { formatDateToLocal } = require("../utils/dateHelper");
// 📌 Get all orders (for DataTables)
const getAllOrders = async (req, res) => {
    try {
        const { draw, start, length, search, order } = req.query;
        const searchQuery = search.value;
        const pageNumber = start / length + 1;
        const pageSize = parseInt(length);
        const sortColumnIndex = order[0].column;
        const sortDirection = order[0].dir;
    
        const columnMap = ["id", "order_date", "status"];
        const sortColumn = columnMap[sortColumnIndex] || "id";
    
        const { orders, totalRecords } = await Order.getAll({ pageNumber, pageSize, searchQuery, sortColumn, sortDirection });
    
        res.json({
          draw: draw,
          recordsTotal: totalRecords,
          recordsFiltered: totalRecords,
          data: orders.map(order => ({
            id:order.id,
            order_number: order.order_number,
            order_date: order.order_date,
            subtotal: order.subtotal,
            status: order.status,
            customer_name: order.customer_name,
            products: order.products.map(p => `${p.product_name} (${p.quantity})`).join(", "),
            actions: `
              <a href="/orders/edit/${order.id}" class="btn btn-warning btn-sm">Edit</a>
              <button class="btn btn-danger btn-sm delete-order" data-id="${order.id}">Delete</button>
            `,
          })),
        });
    } catch (error) {
        console.error("❌ Error fetching order data:", error);
        res.status(500).json({ error: "Error fetching orders" });
    }
};

// 📌 Show Add Order Form
const showAddOrderForm = async (req, res) => {
    console.log("here");
  try {
    const customers = await Customer.getAllCustomers();
    const products = await Product.getAllProducts();
    res.render("orders/order-add", { title: "Add Order", customers, products,user: req.session.user });
  } catch (error) {
    console.error("❌ Error loading add order page:", error);
    res.redirect("/orders");
  }
};

// 📌 Create Order
const createOrder = async (req, res) => {
    try {
        const { customer_id, product_id, quantity, price, order_date } = req.body;

        if (!customer_id || !product_id || !quantity || !price || !order_date) {
            return res.status(400).send("Missing required fields");
        }

        // Format products for insertion using user-provided prices
        const products = product_id.map((id, index) => ({
            product_id: id,
            quantity: quantity[index],
            price: price[index] // Use price entered in form
        }));

        console.log('Processed Products:', products);

        // Create order with the given date
        await Order.create({ customer_id, products, order_date });

        res.redirect("/orders");
    } catch (error) {
        console.error("❌ Error creating order:", error);
        res.status(500).send("Internal Server Error");
    }
};


// 📌 Show Edit Order Form
const showEditOrderForm = async (req, res) => {
    try {
        const order = await Order.getById(req.params.id);
        const customers = await Customer.getAllCustomers();
        const products = await Product.getAllProducts();

        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Ensure order_date is a Date object
        order.order_date = formatDateToLocal(order.order_date);

        console.log("✅ Corrected Order Date:", order.order_date);

        console.log("✅ Order date:", order.order_date);
        res.render("orders/order-edit", { 
            title: "Edit Order",
            user: req.session.user, 
            order, 
            customers, 
            products, 
        });

    } catch (error) {
        console.error("❌ Error fetching order:", error);
        res.status(500).send("Internal Server Error");
    }
};



// 📌 Update Order
const updateOrder = async (req, res) => {
    try {
        const { customer_id, product_id, quantity, price } = req.body;
        const orderId = req.params.id;

        if (!customer_id || !product_id || !quantity || !price) {
            return res.status(400).send("All fields are required");
        }

        // Convert product, quantity, and price arrays into objects
        const products = product_id.map((id, index) => ({
            product_id: id,
            quantity: parseFloat(quantity[index]),
            price: parseFloat(price[index]) // Use provided price instead of fetching from DB
        }));

        await Order.update(orderId, { customer_id, products });

        res.redirect("/orders");
    } catch (error) {
        console.error("❌ Error updating order:", error);
        res.status(500).send("Internal Server Error");
    }
};


const deleteOrder = async (req, res) => {
    try {
        console.log('res',req.params.id);
      await Order.delete(req.params.id);
      res.json({ message: "Order deleted successfully" });
    } catch (err) {
      console.error("❌ Error deleting order:", err);
      res.status(500).json({ message: "Error deleting order" });
    }
  };

// 📌 Activate/Deactivate Order
const toggleOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log("🔄 Updating Order ID:", id, "to status:", status);

    if (!id || !status) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const result = await Order.toggleStatus(id, status);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.redirect("/orders");
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  showAddOrderForm,
  showEditOrderForm,
  getAllOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  toggleOrderStatus,
};
