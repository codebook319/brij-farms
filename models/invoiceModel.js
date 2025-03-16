const db = require("./db");

class Invoice {
    static async getAll({ pageNumber, pageSize, searchQuery, sortColumn, sortDirection }) {
        try {
            let whereClause = "WHERE i.deleted_on IS NULL"; // Ensure only active invoices are retrieved
            let queryParams = [];
    
            // Apply search filters
            if (searchQuery) {
                whereClause += ` AND (c.name LIKE ? OR i.invoice_number LIKE ? OR o.order_number LIKE ?)`;
                queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
            }
            console.log('searchQuery', searchQuery, whereClause);
    
            // Validate sorting column to prevent SQL injection
            const validSortColumns = ["invoice_number", "customer_name", "month", "year", "total_amount", "gst", "grand_total", "status", "created_at", "updated_at"];
            sortColumn = validSortColumns.includes(sortColumn) ? sortColumn : "invoice_number";
            sortDirection = sortDirection.toUpperCase() === "DESC" ? "DESC" : "ASC";
    
            let query = `
                SELECT 
                    i.id AS invoice_id,
                    i.invoice_number,
                    c.name AS customer_name, 
                    GROUP_CONCAT(DISTINCT o.order_number ORDER BY o.order_number SEPARATOR ', ') AS order_numbers,
                    i.month, 
                    i.year, 
                    i.total_amount, 
                    i.gst, 
                    i.grand_total, 
                    i.status, 
                    i.created_at, 
                    i.updated_at
                FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                JOIN invoice_items ii ON i.id = ii.invoice_id
                JOIN orders o ON ii.order_id = o.id
                ${whereClause}
                GROUP BY i.id
                ORDER BY ${sortColumn} ${sortDirection}
                LIMIT ? OFFSET ?;
            `;
    
            queryParams.push(pageSize, (pageNumber - 1) * pageSize);
    
            console.log("📄 Executing Query:", query, queryParams);
            const [rows] = await db.execute(query, queryParams);
    
            if (!rows || rows.length === 0) {
                console.warn("⚠ No invoices found.");
                return { invoices: [], totalRecords: 0 };
            }
    
            // Get total count without LIMIT & OFFSET
            let countQuery = `
                SELECT COUNT(DISTINCT i.id) AS total FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                JOIN invoice_items ii ON i.id = ii.invoice_id
                JOIN orders o ON ii.order_id = o.id
                ${whereClause};
            `;
            const [countRows] = await db.execute(countQuery, queryParams.slice(0, queryParams.length - 2));
    
            return { invoices: rows, totalRecords: countRows[0]?.total || 0 };
        } catch (error) {
            console.error("❌ Database Error:", error);
            throw error;
        }
    }
    

    static async create({ customer_id, month, year, total_amount, gst, grand_total, items }, invoiceItems) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction(); // Start transaction
    
            // Generate Invoice Number
            const invoicePrefix = `INV-${year}${String(month).padStart(2, '0')}`;
            const invoiceNumberQuery = `SELECT COUNT(*) AS count FROM invoices WHERE year = ? AND month = ?`;
            const [invoiceCountResult] = await connection.execute(invoiceNumberQuery, [year, month]);
            const invoiceCount = invoiceCountResult[0].count + 1; // Increment count
            const invoice_number = `${invoicePrefix}-${String(invoiceCount).padStart(4, '0')}`; // e.g., INV-202503-0001
    
            // ✅ Now logging AFTER invoice_number is defined
            console.log("Invoice Data:", {
                invoice_number, customer_id, month, year, total_amount, gst, grand_total, items
            });
    
            // Insert into invoices table
            const invoiceQuery = `
                INSERT INTO invoices (invoice_number, customer_id, month, year, total_amount, gst, grand_total, items)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
    
            const invoiceData = [
                invoice_number,         // ✅ Now it's correctly defined
                customer_id || null,
                month || null,
                year || null,
                total_amount || 0,
                gst || 0,
                grand_total || 0,
                items || "[]"  // Ensure a default value
            ];
            
            const [invoiceResult] = await connection.execute(invoiceQuery, invoiceData);
            const invoice_id = invoiceResult.insertId;
    
            console.log("Invoice Created with ID:", invoice_id);
    
            // Insert invoice items
            const invoiceItemsQuery = `
                INSERT INTO invoice_items (invoice_id, order_id, product_id, quantity, unit_price, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
    
            for (const item of invoiceItems) {
                await connection.execute(invoiceItemsQuery, [
                    invoice_id, item.order_id, item.product_id, item.quantity, item.unit_price, item.amount
                ]);
            }
    
            await connection.commit();
            console.log("Invoice items inserted successfully.");
    
            return invoice_id;
        } catch (error) {
            await connection.rollback();
            console.error("Error inserting invoice:", error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async findById(id) {
        const query = `SELECT * FROM invoices WHERE id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }

    static async findByCustomerId(customer_id) {
        const query = `SELECT * FROM invoices WHERE customer_id = ?`;
        const [rows] = await db.execute(query, [customer_id]);
        return rows;
    }

    static async update(id, { status }) {
        const query = `UPDATE invoices SET status = ?, updated_at = NOW() WHERE id = ?`;
        await db.execute(query, [status, id]);
        return true;
    }

    static async delete(id) {
        const query = `DELETE FROM invoices WHERE id = ?`;
        await db.execute(query, [id]);
        return true;
    }

    static async getById(invoiceId) {
        try {
            const query = `
                SELECT i.*, c.name AS customer_name, c.address, c.phone,c.email
                FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                WHERE i.id = ?
            `;
            const [rows] = await db.query(query, [invoiceId]);
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error("❌ Error fetching invoice by ID:", error);
            throw error;
        }
    }

    static async getInvoiceItems(invoiceId) {
        try {
            const query = `
                SELECT 
                    p.name, ii.quantity, ii.unit_price 
                FROM invoice_items ii
                JOIN products p ON ii.product_id = p.id
                WHERE ii.invoice_id = ?
            `;
            const [rows] = await db.query(query, [invoiceId]);
            return rows;
        } catch (error) {
            console.error("❌ Error fetching invoice items:", error);
            throw error;
        }
    }

    static async updateStatus(invoiceId, status) {
        try {
            const query = `UPDATE invoices SET status = ? WHERE id = ?`;
            const [result] = await db.query(query, [status, invoiceId]);
            return result;
        } catch (error) {
            console.error("❌ Error updating invoice status:", error);
            throw error;
        }
    }

    static async markAsDeleted(invoiceId) {
        try {
            const query = `
                UPDATE invoices 
                SET deleted_on = NOW() 
                WHERE id = ? AND deleted_on IS NULL
            `;
            console.log('query',query);
            const [result] = await db.query(query, [invoiceId]);
            console.log('result',invoiceId);
            return result;
        } catch (error) {
            console.error("❌ Error marking invoice as deleted:", error);
            throw error;
        }
    }
    
    static async getInvoiceById(invoiceId) {
        try {
            const query = `
                SELECT 
                    i.id AS invoice_id,
                    i.invoice_number,
                    i.created_at,
                    i.due_date,
                    c.name AS customer_name,
                    c.address AS customer_address,
                    c.phone AS customer_phone,
                    c.email AS customer_email,
                    i.total_amount
                FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                WHERE i.id = ? AND i.status = 'Approved'
            `;
            const [rows] = await db.execute(query, [invoiceId]);
            if (rows.length === 0) return null;
    
            // Fetch invoice items
            const itemQuery = `
                SELECT 
                    p.name,
                    ii.quantity,
                    ii.unit_price
                FROM invoice_items ii
                JOIN products p ON ii.product_id = p.id
                WHERE ii.invoice_id = ?
            `;
            const [items] = await db.execute(itemQuery, [invoiceId]);
    
            return { ...rows[0], products: items };
        } catch (error) {
            console.error("Error fetching invoice:", error);
            throw error;
        }
    }
    
}

module.exports = Invoice;
