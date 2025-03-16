const db = require('./db');

class Product {

    static async getAllProducts() {
        try {
            const query = `SELECT * FROM products WHERE deleted_on IS NULL ORDER BY name ASC`;
            const [rows] = await db.query(query);
            return rows;
        } catch (error) {
            console.error("❌ Error fetching products:", error);
            throw new Error("Error fetching products");
        }
    }

    static async getPricesByIds(productIds) {
        const query = `SELECT id, price FROM products WHERE id IN (?)`;
        const [rows] = await db.query(query, [productIds]);
        
        // Convert array of objects into a key-value pair (product_id -> price)
        return Object.fromEntries(rows.map(p => [p.id, p.price]));
    }

    static async getAll({ pageNumber, pageSize, searchQuery, sortColumn, sortDirection = 'desc' }) {
        try {
          const allowedSortColumns = ["id", "name", "description","uom", "price", "quantity", "category", "status", "created_at"];
          if (!allowedSortColumns.includes(sortColumn)) {
            sortColumn = "id";
          }
      
          let query = `SELECT * FROM products WHERE deleted_on IS NULL`;
          const searchParams = [];
      
          if (searchQuery && searchQuery.trim() !== "") {
            query += ` AND (name LIKE ? OR description LIKE ? OR category LIKE ?)`;
            searchParams.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
          }
      
          query += ` ORDER BY ${sortColumn} DESC`;
      
          const totalCountQuery = `SELECT COUNT(*) AS total FROM products WHERE deleted_on IS NULL`;
          const [totalRecordsResult] = await db.query(totalCountQuery);
          const totalRecords = totalRecordsResult[0].total;
      
          const [filteredRecordsResult] = await db.query(query, searchParams);
          const filteredRecords = filteredRecordsResult.length;
      
          query += ` LIMIT ? OFFSET ?`;
          searchParams.push(pageSize, (pageNumber - 1) * pageSize);
      
          const [rows] = await db.query(query, searchParams);
      
          return { products: rows, totalRecords, filteredRecords };
        } catch (error) {
          console.error("❌ Error fetching products:", error);
          throw new Error("Error fetching products");
        }
    }

    static async create({ name, description, price, quantity, image, status, uom }) {
        try {
            const query = `
                INSERT INTO products (name, description, price, quantity, image, status, uom)
                VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const values = [name, description, price, quantity, image, status, uom];
    
            const [result] = await db.query(query, values);
            return result.insertId;
        } catch (error) {
            console.error("❌ Error creating product:", error);
            throw new Error("Error creating product");
        }
    }
    
    

    static async getById(productId) {
        try {
            const query = "SELECT * FROM products WHERE id = ?";
            const [rows] = await db.query(query, [productId]);
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error("❌ Error fetching product:", error);
            throw new Error("Error fetching product");
        }
    }
    
    static async update(id, productData) {
        try {
            const fields = Object.keys(productData)
                .filter(key => productData[key] !== null) // Remove null values
                .map(key => `${key} = ?`)
                .join(", ");
            const values = Object.values(productData).filter(value => value !== null);
            values.push(id); // Add ID at the end for WHERE clause
    
            const query = `UPDATE products SET ${fields} WHERE id = ?`;
            await db.query(query, values);
        } catch (error) {
            console.error("❌ Error updating product:", error);
            throw new Error("Database update failed");
        }
    }
    
    

    static async delete(id) {
        try {
            const query = `UPDATE products SET deleted_on = NOW() WHERE id = ?`;
            await db.query(query, [id]);
        } catch (error) {
            console.error("❌ Error deleting product:", error);
            throw new Error("Error deleting product");
        }
    }
    

    static async toggleStatus(id,status) {
        try {
            const query = `UPDATE products SET status = ? WHERE id = ?`;
            const [result] = await db.query(query, [status, id]);
            return result;
        } catch (error) {
            console.error("❌ Error updating product status:", error);
            throw new Error("Error updating product status");
        }
    }

    static async getById(productId) {
        try {
            const query = `SELECT * FROM products WHERE id = ? AND deleted_on IS NULL`;
            const [rows] = await db.query(query, [productId]);

            if (rows.length === 0) {
                return null; // No product found
            }
            return rows[0]; // Return the product
        } catch (error) {
            console.error("❌ Error fetching product by ID:", error);
            throw new Error("Error fetching product");
        }
    }
}

module.exports = Product;