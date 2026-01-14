const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../config/db");

exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;

    // Generate temporary password
    const tempPassword = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await pool.query(
      `UPDATE users
       SET password = $1,
           must_change_password = true,
           temp_password = true
       WHERE user_id = $2
       RETURNING user_id`,
      [hashedPassword, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // IMPORTANT: Return temp password ONCE
    res.json({
      message: "Password reset successful",
      temporaryPassword: tempPassword,
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
