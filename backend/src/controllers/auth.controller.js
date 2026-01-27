const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const userExists = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Get USER role from roles table
    const roleResult = await pool.query(
      "SELECT role_id FROM roles WHERE role_name = 'user'"
    );
    
    if (roleResult.rows.length === 0) {
      return res.status(500).json({ message: "Default role not found" });
    }
    
    const roleId = roleResult.rows[0].role_id;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user (without public_user_id initially)
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role_id, must_change_password, temp_password, token_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, email, name`,
      [name, email, hashedPassword, roleId, false, null, 0] // Start with token_version = 0
    );

    const userId = result.rows[0].user_id;
    
    // Generate public user ID
    const publicUserId = `USR-${String(userId).padStart(6, "0")}`;
    
    // Update user with public_user_id
    await pool.query(
      `UPDATE users SET public_user_id = $1 WHERE user_id = $2`,
      [publicUserId, userId]
    );

    // Generate JWT token with token version
    const token = jwt.sign(
      { 
        userId: userId, 
        publicUserId: publicUserId,
        role: "user",
        tokenVersion: 0, // 🔥 ADD THIS
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return response with public_user_id
    res.status(201).json({
      token,
      user: {
        userId: publicUserId,   // ✅ Return public_user_id as string
        fullName: name,
        email: result.rows[0].email,
        role: "user",
        mustChangePassword: false,
        tempPassword: null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Get user with role information including token_version
    const result = await pool.query(
      `SELECT 
         u.user_id,
         u.public_user_id,
         u.email,
         u.password_hash,
         u.name,
         u.must_change_password,
         u.temp_password,
         u.token_version,
         r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token with token version
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        publicUserId: user.public_user_id,
        role: user.role_name,
        tokenVersion: user.token_version, // 🔥 ADD THIS
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return response with public_user_id and additional fields
    res.json({
      token,
      user: {
        userId: user.public_user_id, // ✅ USR-000006 format
        fullName: user.name,
        email: user.email,
        role: user.role_name,
        mustChangePassword: user.must_change_password,
        tempPassword: user.temp_password,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
};