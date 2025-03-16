const User = require('../models/userModel');

const getAllUsers = async (req, res) => {
    try {
        console.log("🔴 Incoming Request Query:", req.query);  // Debug log

        let { draw, start, length, search, order, columns } = req.query;

        // Convert values to expected types
        draw = parseInt(draw) || 1;
        start = parseInt(start) || 0;
        length = parseInt(length) || 10;
        search = search?.value || ""; // Extract search value

        // Ensure order[0].column and order[0].dir are parsed correctly
        const sortColumnIndex = order?.[0]?.column || 0;
        const sortDirection = order?.[0]?.dir || "asc";
        const sortColumn = columns?.[sortColumnIndex]?.data || "id"; // Default to 'id'

        console.log("🟢 Parsed Parameters:", {
            draw, start, length, search, sortColumn, sortDirection
        });

        // Call user model to get data
        const { users, totalRecords, filteredRecords } = await User.getAll({
            pageNumber: Math.floor(start / length) + 1,
            pageSize: length,
            searchQuery: search,
            sortColumn,
            sortDirection
        });

        res.json({
            draw,
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: users,
        });

    } catch (err) {
        console.error("❌ Error fetching users:", err);
        res.status(500).json({ message: err.message });
    }
};











const createUser = async (req, res) => {
    try {
        const id = await User.create(req.body);
        res.status(201).json({ id });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await User.update(id, req.body);
        if (!updated) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await User.softDelete(id);
        if (!deleted) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }

    
};

const toggleUserStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
  
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
  
      await User.updateStatus(id, status);
      res.json({ message: `User status updated to ${status}` });
    } catch (err) {
      console.error("❌ Error updating status:", err);
      res.status(500).json({ message: "Error updating user status" });
    }
  };

module.exports = { getAllUsers, createUser, updateUser, deleteUser,toggleUserStatus };