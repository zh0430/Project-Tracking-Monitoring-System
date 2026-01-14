const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const auth = require("../middleware/auth.middleware");

router.get("/me", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `
      SELECT 
        u.user_id,
        u.name,
        u.email,
        r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = $1
      `,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      userId: user.user_id,
      fullName: user.name,
      email: user.email,
      role: user.role_name,
    });
  } catch (err) {
    console.error("User /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
