const Customer = require('../models/customerModel');

const getAllCustomers = async (req, res) => {
    try {
      console.log("🔴 Incoming Request Query:", req.query);
  
      let { draw, start, length, search, order, columns } = req.query;
      draw = parseInt(draw) || 1;
      start = parseInt(start) || 0;
      length = parseInt(length) || 10;
      search = search?.value || "";
  
      const sortColumnIndex = order?.[0]?.column || 0;
      const sortDirection = order?.[0]?.dir || "asc";
      const sortColumn = columns?.[sortColumnIndex]?.data || "id";
  
      console.log("🟢 Parsed Parameters:", { draw, start, length, search, sortColumn, sortDirection });
  
      const { customers, totalRecords, filteredRecords } = await Customer.getAll({
        pageNumber: Math.floor(start / length) + 1,
        pageSize: length,
        searchQuery: search,
        sortColumn,
        sortDirection,
      });
  
      res.json({
        draw,
        recordsTotal: totalRecords,
        recordsFiltered: filteredRecords,
        data: customers,
      });
  
    } catch (err) {
      console.error("❌ Error fetching customers:", err);
      res.status(500).json({ message: err.message });
    }
  };
  
  const toggleCustomerStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
  
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
  
      await Customer.updateStatus(id, status);
      res.json({ message: `Customer status updated to ${status}` });
    } catch (err) {
      console.error("❌ Error updating status:", err);
      res.status(500).json({ message: "Error updating customer status" });
    }
  };
  
  const createCustomer = async (req, res) => {
    try {
      console.log("Request Body:", req.body); // Debugging

      const { name, email, phone, address, pincode, location } = req.body;

      // Check if required fields are missing
      if (!name || !email || !phone || !address || !pincode || !location) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Validate phone number (10 digits)
      if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({ error: "Phone number must be 10 digits" });
      }

      // Insert into database
      await Customer.create({ name, email, phone, address, pincode, location, status: "active" });
      
      res.redirect("/customers"); // Redirect after successful creation
    } catch (error) {
      console.error("❌ Error creating customer:", error);
      res.status(500).json({ error: "Error creating customer" });
    }
};

  
const updateCustomer = async (req, res) => {
    try {
        console.log("Received request body:", req.body);

        if (!req.body) {
            return res.status(400).json({ error: "Request body is missing" });
        }

        const { id } = req.params;
        const { name, email, phone, address, pincode, location } = req.body;

        if (!id || !name || !email || !phone || !address || !pincode || !location) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Corrected the function call: Passing `id` separately
        const updated = await Customer.update(id, { name, email, phone, address, pincode, location });

        if (!updated) {
            return res.status(404).json({ error: "Customer not found or update failed" });
        }

        // Redirect only if the request is from a form submission
        if (req.accepts("html")) {
            return res.redirect("/customers");
        } else {
            return res.json({ message: "Customer updated successfully" });
        }
    } catch (error) {
        console.error("❌ Error updating customer:", error);
        res.status(500).json({ error: "Error updating customer" });
    }
};


  
const deleteCustomer = async (req, res) => {
  console.log('res',res.body);
    try {
      await Customer.delete(req.params.id);
      res.json({ message: "Customer deleted successfully" });
    } catch (err) {
      console.error("❌ Error deleting customer:", err);
      res.status(500).json({ message: "Error deleting customer" });
    }
  };
  
  const showAddCustomerForm = (req, res) => {
    res.render("customers/customer-add", { title: "Add Customer", user: req.session.user });
  };
  
  const showEditCustomerForm = async (req, res) => {
    try {
      const customerId = req.params.id;
      const customer = await Customer.findById(customerId);
        
      if (!customer) {
        return res.status(404).send("Customer not found");
      }
  
      res.render("customers/customer-edit", { title: "Edit Customer", user: req.session.user, customer });
    } catch (err) {
      console.error("❌ Error fetching customer:", err);
      res.status(500).send("Error loading edit form");
    }
  };
  
  module.exports = { 
    showAddCustomerForm, 
    showEditCustomerForm, 
    getAllCustomers, 
    toggleCustomerStatus, 
    createCustomer, 
    updateCustomer, 
    deleteCustomer 
  };
  