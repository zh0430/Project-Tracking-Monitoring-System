// Import database connection pool
const pool = require("../config/db");

// Import bcrypt library for hashing passwords securely
const bcrypt = require("bcrypt");

// Controller function to reset a user's password
exports.resetUserPassword = async (req, res) => {
  // Get public_user_id from request parameters (URL)
  const publicUserId = req.params.id;

  try {
    // 1. Generate a temporary password (random string, 10 characters)
    const tempPassword = Math.random().toString(36).slice(-10);

    // 2. Hash the temporary password before storing in database
    // '10' is the salt rounds (higher = more secure but slower)
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 3. Update the user's password in the database using public_user_id
    const result = await pool.query(
      `
      UPDATE users
      SET 
        password_hash = $1,              -- store hashed password
        must_change_password = true      -- force user to change password after login
      WHERE public_user_id = $2          -- identify user by public ID
      RETURNING public_user_id           -- return updated user ID
      `,
      [hashedPassword, publicUserId]     // values passed safely (prevents SQL injection)
    );

    // If no user is found with the given ID
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 4. Send the temporary password back to the client (ONLY once)
    res.json({
      message: "Password reset successful",
      temporaryPassword: tempPassword,   // user must save this immediately
    });

  } catch (err) {
    // Log error for debugging
    console.error("Reset password error:", err);

    // Return server error response
    res.status(500).json({ message: "Server error" });
  }
};