const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticate = require("../middleware/auth.middleware");
const authorizeAdmin = require("../middleware/admin.middleware");
const { resetUserPassword } = require("../controllers/admin.controller");

// Get current admin profile
router.get(
  "/me",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT u.public_user_id, u.name, u.email 
         FROM users u 
         JOIN roles r ON u.role_id = r.role_id 
         WHERE u.user_id = $1
         AND r.role_name = 'admin'`,
        [req.user.userId]
      );

      const admin = result.rows[0];

      if (!admin) {
        return res.status(404).json({
          message: "Admin not found",
        });
      }

      res.json({
        adminID: admin.public_user_id,
        name: admin.name,
        email: admin.email,
      });
    } catch (err) {
      console.error("Admin /me error:", err);
      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// Get all employees (users) - excluding admin users
router.get(
  "/employees",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          u.public_user_id AS "userID",
          u.role_id AS "roleID",
          u.name,
          u.email
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE r.role_name != 'admin'
      `);

      res.json(result.rows);
    } catch (err) {
      console.error("Admin /employees error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all roles
router.get(
  "/roles",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          role_id AS "roleID",
          role_name AS "roleName"
        FROM roles
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Admin /roles error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Reset user password (admin only)
router.post(
  "/users/:id/reset-password",
  authenticate,
  authorizeAdmin,
  resetUserPassword
);

// Placeholder endpoints (to be implemented)
router.get("/tasks", authenticate, authorizeAdmin, (req, res) => res.json([]));
router.get("/priorities", authenticate, authorizeAdmin, (req, res) => res.json([]));
router.get("/statuses", authenticate, authorizeAdmin, (req, res) => res.json([]));
router.get("/notifications", authenticate, authorizeAdmin, (req, res) => res.json([]));

module.exports = router;