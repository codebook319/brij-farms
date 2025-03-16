const db = require('./db');// Ensure correct DB connection

class Customer {
  static async getAllCustomers() {
    try {
        const query = `SELECT * FROM customers WHERE deleted_on IS NULL ORDER BY name ASC`;
        const [rows] = await db.query(query);
        return rows;
    } catch (error) {
        console.error("❌ Error fetching customers:", error);
        throw new Error("Error fetching customers");
    }
}

  // 🟢 Fetch All Customers with Pagination & Filtering
  static async getAll({ pageNumber, pageSize, searchQuery, sortColumn, sortDirection }) {
    try {
      const allowedSortColumns = ["id", "name", "email", "phone", "address", "location", "status", "created_at"];
      if (!allowedSortColumns.includes(sortColumn)) {
        sortColumn = "id";
      }

      let query = `SELECT * FROM customers WHERE deleted_on IS NULL`;
      const searchParams = [];

      // Search filter
      if (searchQuery && searchQuery.trim() !== "") {
        query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR location LIKE ?)`;
        searchParams.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
      }

      // Sorting
      query += ` ORDER BY ${sortColumn} ${sortDirection === "desc" ? "DESC" : "ASC"}`;

      // Total count before filtering
      const totalCountQuery = `SELECT COUNT(*) AS total FROM customers WHERE deleted_on IS NULL`;
      const [totalRecordsResult] = await db.query(totalCountQuery);
      const totalRecords = totalRecordsResult[0].total;

      // Filtered count after search
      const [filteredRecordsResult] = await db.query(query, searchParams);
      const filteredRecords = filteredRecordsResult.length;

      // Pagination
      query += ` LIMIT ? OFFSET ?`;
      searchParams.push(pageSize, (pageNumber - 1) * pageSize);

      const [rows] = await db.query(query, searchParams);

      return { customers: rows, totalRecords, filteredRecords };
    } catch (error) {
      console.error("❌ Error fetching customers:", error);
      throw new Error("Error fetching customers");
    }
  }

  // 🟢 Get a Single Customer by ID
  static async findById(customerId) {
    try {
      const query = `SELECT * FROM customers WHERE id = ? AND deleted_on IS NULL`;
      const [rows] = await db.query(query, [customerId]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error("❌ Error finding customer:", error);
      throw new Error("Error finding customer");
    }
  }

  // 🟢 Create a New Customer
  static async create({ name, email, phone, address, pincode, location, status }) {
    try {
      const query = `INSERT INTO customers (name, email, phone, address, pincode, location, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const [result] = await db.query(query, [name, email, phone, address, pincode, location, status]);
      console.log('result',result);
      return result.insertId;
    } catch (error) {
      console.error("❌ Error creating customer:", error);
      throw new Error("Error creating customer");
    }
}


  // 🟢 Update an Existing Customer
  static async update(customerId, { name, email, phone, address, pincode, location }) {
    try {
        const query = `UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, pincode = ?, location = ? WHERE id = ?`;
        const [result] = await db.query(query, [name, email, phone, address, pincode, location, customerId]);

        return result.affectedRows > 0;
    } catch (error) {
        console.error("❌ Error updating customer:", error);
        throw new Error("Error updating customer");
    }
}


  // 🟢 Soft Delete (Mark Customer as Deleted)
  static async delete(customerId) {
    try {
      const query = `UPDATE customers SET deleted_on = NOW() WHERE id = ?`;
      const [result] = await db.query(query, [customerId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("❌ Error deleting customer:", error);
      throw new Error("Error deleting customer");
    }
  }

  // 🟢 Toggle Customer Status (Activate/Deactivate)
  static async updateStatus(customerId) {
    try {
      // Get current status
      const customer = await this.findById(customerId);
      if (!customer) throw new Error("Customer not found");

      const newStatus = customer.status === "active" ? "inactive" : "active";
      const query = `UPDATE customers SET status = ? WHERE id = ?`;
      const [result] = await db.query(query, [newStatus, customerId]);

      return result.affectedRows > 0 ? newStatus : null;
    } catch (error) {
      console.error("❌ Error toggling customer status:", error);
      throw new Error("Error toggling customer status");
    }
  }
}

module.exports = Customer;
