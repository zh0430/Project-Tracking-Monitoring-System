const pool = require("../config/db");
const bcrypt = require("bcrypt");

exports.resetUserPassword = async (req, res) => {
  const userId = req.params.id;

  try {
    // 1. Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-10);

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 3. Update user
    const result = await pool.query(
      `
      UPDATE users
      SET 
        password_hash = $1,
        must_change_password = true
      WHERE user_id = $2
      RETURNING user_id
      `,
      [hashedPassword, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 4. Return temp password ONCE
    res.json({
      message: "Password reset successful",
      temporaryPassword: tempPassword,
    });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
