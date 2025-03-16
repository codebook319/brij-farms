const invoice = require("../models/invoiceModel");
const Order = require("../models/orderModel");
const { formatDateToLocal } = require("../utils/dateHelper");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
class invoiceController {
    // Render the invoices page

    static async getAllInvoices(req, res) {
        try {
            // console.log("🔍 Incoming DataTable Request:", req.query);
    
            const { draw, start, length, search, order } = req.query;
            const searchQuery = search ? search.value : "";
            const pageNumber = start / length + 1 || 1;
            const pageSize = parseInt(length) || 10;
    
            // console.log(`🔄 Processing Page: ${pageNumber}, Page Size: ${pageSize}, Search: ${searchQuery}`);
    
            const columnMap = ["invoice_number", "customer_name", "order_number", "invoice_month", "total_amount", "grand_total", "status", "created_at", "updated_at"];
            const sortColumnIndex = order?.[0]?.column || 0;
            const sortColumn = columnMap[sortColumnIndex] || "created_at"; 
            const sortDirection = order?.[0]?.dir || "asc";
    
            // console.log(`🔄 Sorting By: ${sortColumn} (${sortDirection})`);
    
            // Fetch invoices from the model
            const result = await invoice.getAll({
                pageNumber,
                pageSize,
                searchQuery,
                sortColumn,
                sortDirection,
            });
    
            console.log("✅ Raw Invoices Result:", result);
    
            if (!result || !result.invoices) {
                console.warn("⚠ No invoices returned from database.");
                return res.json({
                    draw: parseInt(draw),
                    recordsTotal: 0,
                    recordsFiltered: 0,
                    data: [],
                });
            }
    
            const { invoices, totalRecords } = result;
            // console.log("✅ Invoices Fetched:", invoices.length);
    
            res.json({
                draw: parseInt(draw),
                recordsTotal: totalRecords,
                recordsFiltered: totalRecords,
                data: invoices.map(invoice => ({
                    invoice_number: invoice.invoice_number,
                    customer_name: invoice.customer_name || "N/A",
                    order_number: invoice.order_numbers ? invoice.order_numbers.split(", ").join(", ") : "N/A",
                    invoice_month: `${invoice.month}/${invoice.year}`,
                    total_amount: `₹${parseFloat(invoice.total_amount).toFixed(2)}`,
                    status: invoice.status,
                    created_at: new Date(invoice.created_at).toLocaleDateString(),
                    updated_at: new Date(invoice.updated_at).toLocaleDateString(),
                    actions: `
                        <a href="/invoices/view/${invoice.invoice_id}" class="btn btn-sm btn-primary">View</a>
                        <button class="btn btn-sm btn-danger delete-invoice" data-id="${invoice.invoice_id}">Delete</button>
                    `,
                })),
            });
        } catch (error) {
            console.error("❌ Error fetching invoices:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    // Generate invoice for a specific customer
    static async generateInvoice(req, res) { 
        try {
            const { customer_id } = req.params;
            const month = new Date().getMonth() + 1;
            const year = new Date().getFullYear();
    
            console.log("Generating invoice for customer:", customer_id, "Month:", month, "Year:", year);
    
            // Fetch all completed orders for the customer in the given month
            const orders = await Order.getOrdersForMonth(customer_id, month, year);
           
            if (!orders.length) {
                console.log("No orders found for this month.");
                return res.status(404).json({ message: "No orders found for this month." });
            }
    
            let totalAmount = 0;
            const invoiceItems = [];
    
            for (const order of orders) {
                console.log('orders',order.items);
                for (const item of order.items) {
                    totalAmount += item.quantity * item.unit_price;
                    invoiceItems.push({
                        order_id: order.order_id, // Include order_id
                        product_id: item.product_id, // Include product_id
                        product_name: item.product_name,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        amount: item.quantity * item.unit_price
                    });
                }
            }
    
            // Calculate GST (5%)
            const gst = totalAmount * 0.05;
            const grandTotal = totalAmount + gst;
    
            console.log("Total Amount:", totalAmount, "GST:", gst, "Grand Total:", grandTotal);
            console.log("Invoice Items:", invoiceItems);
    
            // Generate invoice
            const invoiceData = {
                customer_id,
                month,
                year,
                total_amount: totalAmount,
                gst,
                grand_total: grandTotal,
                items: JSON.stringify(invoiceItems)
            };
    
            console.log("Final Invoice Data:", invoiceData);
    
            const invoiceId = await invoice.create(invoiceData, invoiceItems); // Pass invoiceItems to model
    
            res.status(201).json({ message: "Invoice generated successfully", invoiceId });
        } catch (error) {
            console.error("Error generating invoice:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    // Generate invoices for all customers for the current month
    static async generateAllInvoices(req, res) {
        try {
            const customers = await Order.getDistinctCustomers();
            if (!customers.length) return res.status(404).json({ message: "No customers found with orders." });

            for (const customer_id of customers) {
                await invoiceController.generateInvoice({ params: { customer_id } }, res);
            }

            res.redirect("/invoices");
        } catch (error) {
            console.error("Error generating all invoices:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    // View a specific invoice
    static async viewInvoice(req, res) {
        try {
            const { invoiceId } = req.params;
            console.log("Received Invoice ID:", invoiceId);
    
            // Fetch invoice details
            const invoicedata = await invoice.getById(invoiceId);
            if (!invoicedata) return res.status(404).send("Invoice not found");
    
            // Fetch invoice items (products)
            let products = await invoice.getInvoiceItems(invoiceId);
    
            // Ensure products is always an array to avoid "forEach" error
            if (!Array.isArray(products)) {
                products = [];
            }
    
            // Fetch customer details from `invoicedata`
            const customer = {
                name: invoicedata.customer_name, 
                address: invoicedata.address,
                phone: invoicedata.phone || "N/A",
                email: invoicedata.email || "N/A"
            };
    
            console.log("Invoice Data:", invoicedata);
            console.log("Products Data:", products);
            console.log("Customer Data:", customer);
            invoicedata.invoice_date = formatDateToLocal(invoicedata.created_at);
            invoicedata.due_date = formatDateToLocal(invoicedata.due_date)
            res.render("invoices/view-invoices", { 
                title: "Invoice View",
                user: req.session.user, 
                invoicedata, 
                customer,
                products
            });
    
        } catch (error) {
            console.error("❌ Error fetching invoice:", error);
            res.status(500).send("Error fetching invoice");
        }
    }

    static async getOrdersForMonth(customer_id, month, year) {
        try {
            const query = `
                SELECT o.id AS order_id, o.order_date, oi.product_id, oi.quantity, oi.unit_price, p.product_name
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE o.customer_id = ? AND MONTH(o.order_date) = ? AND YEAR(o.order_date) = ?
            `;

            const [rows] = await db.execute(query, [customer_id, month, year]);

            // Group items under their respective orders
            const ordersMap = {};
            rows.forEach(row => {
                if (!ordersMap[row.order_id]) {
                    ordersMap[row.order_id] = {
                        order_id: row.order_id,
                        order_date: row.order_date,
                        items: []
                    };
                }
                ordersMap[row.order_id].items.push({
                    product_name: row.product_name,
                    quantity: row.quantity,
                    unit_price: row.unit_price
                });
            });

            return Object.values(ordersMap); // Convert object back to an array
        } catch (error) {
            console.error("Error fetching orders for customer:", error);
            throw error;
        }
    }

    static async approveInvoice(req, res) {
        try {
            const { invoiceId } = req.params;
    
            // Update invoice status to "Approved"
            const result = await invoice.updateStatus(invoiceId, "Approved");
    
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Invoice not found" });
            }
    
            res.json({ success: true, message: "Invoice approved successfully" });
    
        } catch (error) {
            console.error("❌ Error approving invoice:", error);
            res.status(500).json({ success: false, message: "Error approving invoice" });
        }
    }

    static async deleteInvoice(req, res) {
        try {
            const { invoiceId } = req.params;
    
            // Update the deleted_at column to mark as deleted
            const result = await invoice.markAsDeleted(invoiceId);
            
            if (result.affectedRows > 0) {
                return res.json({ success: true, message: "Invoice deleted successfully!" });
            } else {
                return res.status(404).json({ success: false, message: "Invoice not found." });
            }
        } catch (error) {
            console.error("❌ Error deleting invoice:", error);
            return res.status(500).json({ success: false, message: "Error deleting invoice." });
        }
    }

    static async downloadInvoice(req, res) {
        try {
            const invoiceId = req.params.id;
    
            // Fetch invoice data
            const invoiceData = await invoice.getInvoiceById(invoiceId);
            if (!invoiceData) {
                return res.status(404).json({ success: false, message: "Invoice not found" });
            }
    
            // Define invoice template path
            const templatePath = path.join(__dirname, "../views/invoices/invoice-template.ejs");
            invoiceData.invoice_date = formatDateToLocal(invoiceData.created_at);
            invoiceData.due_date = formatDateToLocal(invoiceData.due_date)
            // Render EJS template with data
            const htmlContent = await ejs.renderFile(templatePath, {
                invoicedata: invoiceData,
                customer: {
                    name: invoiceData.customer_name,
                    address: invoiceData.customer_address,
                    phone: invoiceData.customer_phone,
                    email: invoiceData.customer_email,
                },
                products: invoiceData.products,
                req
            });
    
            // Launch Puppeteer browser
            const browser = await puppeteer.launch({ headless: "new" }); // `headless: true` ensures no UI pops up
            const page = await browser.newPage();
    
            // Set content and wait for it to load
            await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    
            // Define the PDF file path
            const pdfPath = path.join(__dirname, `../public/invoices/invoice_${invoiceData.invoice_number}.pdf`);
    
            // Generate PDF
            await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    
            // Close the browser
            await browser.close();
    
            // Send the PDF as a downloadable file
            res.download(pdfPath, `${invoiceData.invoice_number}.pdf`);
        } catch (error) {
            console.error("Error generating invoice PDF:", error);
            res.status(500).json({ success: false, message: "Error generating invoice PDF" });
        }
    }
}

module.exports = invoiceController;
