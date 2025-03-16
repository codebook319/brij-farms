const db = require('./db');
const bcrypt = require('bcrypt');

class User {
    static async findByEmail(email) {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND deleted_on IS NULL', [email]);
        console.log("user email",rows[0]);
        return rows[0];
    }

    static async testDbConnection() {
        try {
            const [rows] = await db.query('SELECT 1 AS test');
            console.log(rows);  // Should log an array with { test: 1 }
        } catch (err) {
            console.error('Error connecting to database:', err);
        }
    }

    static async getAll({ pageNumber, pageSize, searchQuery, sortColumn, sortDirection }) {
        try {
            // ✅ Validate sortColumn to avoid SQL injection
            const allowedSortColumns = ["id", "name", "email", "role", "status", "created_at"];
            if (!allowedSortColumns.includes(sortColumn)) {
                sortColumn = "id"; // Default to ID if invalid
            }
    
            // ✅ Fix query string
            let query = `SELECT * FROM users WHERE deleted_on IS NULL`;
    
            // ✅ Search condition
            const searchParams = [];
            if (searchQuery && searchQuery.trim() !== "") {
                query += ` AND (name LIKE ? OR email LIKE ?)`;
                searchParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
            }
    
            // ✅ Order By (Avoid SQL Injection)
            query += ` ORDER BY ${sortColumn} ${sortDirection === "desc" ? "DESC" : "ASC"}`;
    
            // ✅ Get total records count
            const totalCountQuery = `SELECT COUNT(*) AS total FROM users WHERE deleted_on IS NULL`;
            const [totalRecordsResult] = await db.query(totalCountQuery);
            const totalRecords = totalRecordsResult[0].total;
    
            // ✅ Get filtered records count
            const filteredCountQuery = query;
            const [filteredRecordsResult] = await db.query(filteredCountQuery, searchParams);
            const filteredRecords = filteredRecordsResult.length;
    
            // ✅ Paginate
            query += ` LIMIT ? OFFSET ?`;
            searchParams.push(pageSize, (pageNumber - 1) * pageSize);
    
            // ✅ Get paginated users
            const [rows] = await db.query(query, searchParams);
    
            return {
                users: rows,
                totalRecords,
                filteredRecords,
            };
        } catch (error) {
            console.error("❌ Error fetching users:", error);
            throw new Error("Error fetching users");
        }
    }
    
    
    
    

    static async create(user) {
        const { name, email, password, role, status = 'active' } = user;
        const hashedPassword = password
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, status]
        );
        return result.insertId;
    }

    static async update(id, updates) {
        const { name, email, role, status } = updates;
        const [result] = await db.query(
            'UPDATE users SET name = ?, email = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_on IS NULL',
            [name, email, role, status, id]
        );
        return result.affectedRows > 0;
    }

    static async softDelete(id) {
        const [result] = await db.query(
            'UPDATE users SET deleted_on = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    static async updateStatus(id, status) {
        try {
          const query = `UPDATE users SET status = ? WHERE id = ?`;
          await db.query(query, [status, id]);
        } catch (error) {
          console.error("❌ Error updating user status:", error);
          throw new Error("Error updating user status");
        }
      }

}



module.exports = User;