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

    // Create new user
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, email`,
      [name, email, hashedPassword, roleId]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.rows[0].user_id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return response
    res.status(201).json({
      token,
      user: {
  userId: result.rows[0].user_id,
  fullName: name,
  email: result.rows[0].email,
  role: "user"
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
    // Get user with role information
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.password_hash, u.name, r.role_name
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

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return response
    res.json({
  token,
  user: {
    userId: user.user_id,      // ✅ consistent
    fullName: user.name,       // ✅ consistent
    email: user.email,
    role: user.role_name       // "admin" | "user"
  }
});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
};