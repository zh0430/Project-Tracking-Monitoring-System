const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const auth = require("../middleware/auth.middleware");
const bcrypt = require("bcrypt");

/**
 * USER PROFILE ROUTES
 * Handles user profile management including viewing profile, updating information,
 * changing password, and account deletion. All routes require authentication.
 */

// Get current user profile
router.get("/me", auth, async (req, res) => {
  try {
    const userId = req.user.userId; // This should be the numeric user_id from JWT

    const result = await pool.query(
      `
      SELECT 
        u.user_id,
        u.public_user_id,
        u.name,
        u.email,
        u.phone,
        u.department,
        u.profile_picture,
        u.must_change_password, 
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
      userId: user.public_user_id,
      fullName: user.name,
      email: user.email,
      phoneNumber: user.phone,
      department: user.department,
      profilePicture: user.profile_picture,
      role: user.role_name,
      mustChangePassword: user.must_change_password,
    });
  } catch (err) {
    console.error("User /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/me", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, email, phoneNumber, department, profilePicture } = req.body;

    const result = await pool.query(
      `
      UPDATE users
      SET 
        name = $1,
        email = $2,
        phone = $3,
        department = $4,
        profile_picture = $5
      WHERE user_id = $6
      RETURNING public_user_id, name, email, phone, department, profile_picture
      `,
      [fullName, email, phoneNumber, department, profilePicture, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = result.rows[0];

    res.json({
      userId: updatedUser.public_user_id,
      fullName: updatedUser.name,
      email: updatedUser.email,
      phoneNumber: updatedUser.phone,
      department: updatedUser.department,
      profilePicture: updatedUser.profile_picture,
    });

  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Change password endpoint
router.put("/change-password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId; // numeric user_id from JWT

  // Input validation
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current password and new password are required" });
  }

  // Additional password validation (optional)
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters long" });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "New password must be different from current password" });
  }

  try {
    // Get user's current password hash and temp password
    const result = await pool.query(
      "SELECT password_hash, temp_password FROM users WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password_hash, temp_password } = result.rows[0];

    // Verify current password - check both regular and temp password
    let isMatch = await bcrypt.compare(currentPassword, password_hash);

    // Allow temp password if provided
    if (!isMatch && temp_password) {
      isMatch = await bcrypt.compare(currentPassword, temp_password);
    }

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password, reset flags, and increment token version to invalidate all tokens
    await pool.query(
      `
      UPDATE users
      SET 
        password_hash = $1,
        must_change_password = false,
        temp_password = NULL,
        token_version = token_version + 1
      WHERE user_id = $2
      `,
      [hashedPassword, userId]
    );

    res.json({ 
      message: "Password updated successfully. All existing sessions have been invalidated." 
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete user account
router.delete("/me", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // First, delete related records (project_assignments, project_milestones)
    await pool.query(`DELETE FROM project_assignments WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM project_milestones WHERE project_id IN (SELECT id FROM projects WHERE id IN (SELECT project_id FROM project_assignments WHERE user_id = $1))`, [userId]);
    
    // Then delete the user
    const result = await pool.query(
      `DELETE FROM users WHERE user_id = $1 RETURNING user_id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;