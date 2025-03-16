const db = require("./db");

class Order {
    // 📌 Get all orders (with pagination, search, sorting)
    // static async getAll({ pageNumber, pageSize, searchQuery, sortColumn, sortDirection }) {
    //     try {
    //         const allowedSortColumns = ["id", "order_date", "status"];
    //         if (!allowedSortColumns.includes(sortColumn)) {
    //             sortColumn = "id";
    //         }
    
    //         let query = `
    //             SELECT 
    //                 o.id, 
    //                 o.order_date, 
    //                 o.status, 
    //                 c.name AS customer_name,
    //                 COALESCE(SUM(oi.subtotal), 0) AS subtotal  -- Calculate total order subtotal
    //             FROM orders o
    //             JOIN customers c ON o.customer_id = c.id
    //             LEFT JOIN order_items oi ON o.id = oi.order_id -- Join to get subtotal
    //             WHERE o.deleted_on IS NULL`;
    
    //         const searchParams = [];
    //         if (searchQuery && searchQuery.trim() !== "") {
    //             query += ` AND (c.name LIKE ? OR o.status LIKE ?)`;
    //             searchParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    //         }
    
    //         query += ` GROUP BY o.id, o.order_date, o.status, c.name`; // Group by order ID
    
    //         const totalCountQuery = `SELECT COUNT(*) AS total FROM orders WHERE deleted_on IS NULL`;
    //         const [totalRecordsResult] = await db.query(totalCountQuery);
    //         const totalRecords = totalRecordsResult[0].total;
    
    //         query += ` ORDER BY ${sortColumn} ${sortDirection === "desc" ? "DESC" : "ASC"}`;
    //         query += ` LIMIT ? OFFSET ?`;
    //         searchParams.push(pageSize, (pageNumber - 1) * pageSize);
    
    //         const [rows] = await db.query(query, searchParams);
    
    //         // Fetch order items separately
    //         for (let order of rows) {
    //             const orderItemsQuery = `
    //                 SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price, oi.subtotal
    //                 FROM order_items oi
    //                 JOIN products p ON oi.product_id = p.id
    //                 WHERE oi.order_id = ?`;
    //             const [orderItems] = await db.query(orderItemsQuery, [order.id]);
    //             order.products = orderItems;
    //         }
    
    //         return { orders: rows, totalRecords };
    //     } catch (error) {
    //         console.error("❌ Error fetching orders:", error);
    //         throw new Error("Error fetching orders");
    //     }
    // }
    
    static async getAll({ pageNumber, pageSize, searchQuery, sortColumn, sortDirection = "desc" }) {
        try {
            const allowedSortColumns = ["id", "order_number","order_date", "status"];
            if (!allowedSortColumns.includes(sortColumn)) {
                sortColumn = "id";
            }
    
            let query = `
                SELECT o.id, o.order_number, o.order_date, o.status, c.name AS customer_name
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE o.deleted_on IS NULL`;
    
            const searchParams = [];
            if (searchQuery && searchQuery.trim() !== "") {
                query += ` AND (c.name LIKE ? OR o.status LIKE ?)`;
                searchParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
            }
    
            const totalCountQuery = `SELECT COUNT(*) AS total FROM orders WHERE deleted_on IS NULL`;
            const [totalRecordsResult] = await db.query(totalCountQuery);
            const totalRecords = totalRecordsResult[0].total;
    
            query += ` ORDER BY ${sortColumn} DESC`;
            query += ` LIMIT ? OFFSET ?`;
            searchParams.push(pageSize, (pageNumber - 1) * pageSize);
            console.log(query);
            const [rows] = await db.query(query, searchParams);
    
            // Fetch order items and calculate subtotal
            for (let order of rows) {
                const orderItemsQuery = `
                    SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price, oi.subtotal
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?`;
    
                const [orderItems] = await db.query(orderItemsQuery, [order.id]);
                order.products = orderItems;
    
                // Calculate subtotal (Sum of all order item subtotals)
                order.subtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    
                console.log(`✅ Order ID: ${order.id}, Subtotal: ${order.subtotal}`); // Debug log
            }
    
            return { orders: rows, totalRecords };
        } catch (error) {
            console.error("❌ Error fetching orders:", error);
            throw new Error("Error fetching orders");
        }
    }

    // 📌 Create a new order
    static async create({ customer_id, products, order_date }) { 
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
    
            // Generate Order Number
            const month = new Date(order_date).getMonth() + 1;
            const year = new Date(order_date).getFullYear();
            const orderPrefix = `ORD-${year}${String(month).padStart(2, '0')}`;
    
            // Count existing orders for the current month
            const orderNumberQuery = `SELECT COUNT(*) AS count FROM orders WHERE YEAR(order_date) = ? AND MONTH(order_date) = ?`;
            const [orderCountResult] = await connection.execute(orderNumberQuery, [year, month]);
            const orderCount = orderCountResult[0].count + 1;
            const order_number = `${orderPrefix}-${String(orderCount).padStart(4, '0')}`; 
    
            console.log("Generated Order Number:", order_number);
    
            // Insert into orders table
            const orderQuery = `INSERT INTO orders (order_number, customer_id, order_date) VALUES (?, ?, ?)`;
            const [orderResult] = await connection.query(orderQuery, [order_number, customer_id, order_date]);
            const orderId = orderResult.insertId;
    
            // Validate products data
            const orderItemsValues = products.map(product => {
                const productId = product.product_id;
                const quantity = parseFloat(product.quantity) || 0;
                const price = parseFloat(product.price) || 0;
                const subtotal = price * quantity;
    
                console.log(`Product ID: ${productId}, Quantity: ${quantity}, Price: ${price}, Subtotal: ${subtotal}`);
    
                return [orderId, productId, quantity, price, subtotal];
            });
    
            // Check if orderItemsValues contains valid data before inserting
            if (orderItemsValues.some(item => isNaN(item[3]) || isNaN(item[4]))) {
                throw new Error("Invalid price or subtotal detected in order items.");
            }
    
            // Insert products into order_items table
            const orderItemsQuery = `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES ?`;
            await connection.query(orderItemsQuery, [orderItemsValues]);
    
            await connection.commit();
            return orderId;
        } catch (error) {
            await connection.rollback();
            console.error("❌ Error creating order:", error);
            throw new Error("Error creating order");
        } finally {
            connection.release();
        }
    }
    

    // 📌 Get order by ID (including order items)
    static async getById(id) {
        const [rows] = await db.execute(
          `SELECT orders.*, customers.name AS customer_name 
           FROM orders 
           JOIN customers ON orders.customer_id = customers.id 
           WHERE orders.id = ?`,
          [id]
        );
    
        if (rows.length === 0) return null;
    
        const order = rows[0];
    
        const [items] = await db.execute(
          `SELECT order_items.product_id, order_items.quantity, products.name ,order_items.unit_price,order_items.subtotal
           FROM order_items 
           JOIN products ON order_items.product_id = products.id 
           WHERE order_items.order_id = ?`,
          [id]
        );
    
        order.items = items;
        return order;
    }

    // 📌 Update an order
    static async update(orderId, { customer_id, products }) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
    
            // Update customer_id in orders table
            const updateOrderQuery = `UPDATE orders SET customer_id = ?, updated_at = NOW() WHERE id = ?`;
            await connection.query(updateOrderQuery, [customer_id, orderId]);
    
            // Delete old products for this order
            const deleteItemsQuery = `DELETE FROM order_items WHERE order_id = ?`;
            await connection.query(deleteItemsQuery, [orderId]);
    
            // Prepare order items with user-defined prices
            const orderItemsValues = products.map(product => {
                const subtotal = product.price * product.quantity; // Calculate subtotal dynamically
    
                return [
                    orderId,
                    product.product_id,
                    product.quantity,
                    product.price,  // ✅ Editable price input
                    subtotal
                ];
            });
    
            // Debugging: Check data before inserting
            console.log("🔍 Order Items Insert:", orderItemsValues);
    
            // Insert new products into order_items
            if (orderItemsValues.length > 0) {
                const orderItemsQuery = `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES ?`;
                await connection.query(orderItemsQuery, [orderItemsValues]);
            }
    
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            console.error("❌ Error updating order:", error);
            throw new Error("Error updating order");
        } finally {
            connection.release();
        }
    }

    static async delete(orderId) {
        try {
            const deleteOrderItemsQuery = `UPDATE order_items SET deleted_on = NOW() WHERE order_id = ?`;
            await db.query(deleteOrderItemsQuery, [orderId]);

            const deleteOrderQuery = `UPDATE orders SET deleted_on = NOW() WHERE id = ?`;
            await db.query(deleteOrderQuery, [orderId]);

            return { success: true };
        } catch (error) {
            console.error("❌ Error deleting order:", error);
            throw new Error("Error deleting order");
        }
    }

    // 📌 Toggle order status (Activate/Deactivate)
    static async toggleStatus(id, status) {
        try {
            const query = `UPDATE orders SET status = ? WHERE id = ?`;
            const [result] = await db.query(query, [status, id]);
            return result;
        } catch (error) {
            console.error("❌ Error updating order status:", error);
            throw new Error("Error updating order status");
        }
    }
    static async getDistinctCustomers() {
        try {
            const month = new Date().getMonth() + 1;
            const year = new Date().getFullYear();

            const query = `
                SELECT DISTINCT customer_id 
                FROM orders 
                WHERE MONTH(order_date) = ? AND YEAR(order_date) = ?
            `;

            const [rows] = await db.execute(query, [month, year]);
            return rows.map(row => row.customer_id);
        } catch (error) {
            console.error("Error fetching distinct customers:", error);
            throw error;
        }
    }

    static async getOrdersForMonth(customer_id, month, year) {
        try {
            const query = `
                SELECT o.id AS order_id, o.order_date, oi.product_id, oi.quantity, oi.unit_price, p.name AS product_name
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
                    product_id: row.product_id,
                    product_name: row.product_name, // Now correctly mapped
                    quantity: row.quantity,
                    unit_price: row.unit_price
                });
            });

            return Object.values(ordersMap);
        } catch (error) {
            console.error("Error fetching orders for customer:", error);
            throw error;
        }
    }

    static async getOrderItems(orderId) {
        const connection = await db.getConnection();
        try {
            const query = `
                SELECT oi.product_id, p.name AS product_name, p.sku, oi.quantity, oi.unit_price, oi.subtotal
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            `;
            const [orderItems] = await connection.query(query, [orderId]);
            return orderItems;
        } catch (error) {
            console.error("❌ Error fetching order items:", error);
            throw new Error("Error fetching order items");
        } finally {
            connection.release();
        }
    }
}

module.exports = Order;
