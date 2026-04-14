// Import database connection
const pool = require("../config/db");

// Import bcrypt for password hashing
const bcrypt = require("bcrypt");

// Import JWT for authentication tokens
const jwt = require("jsonwebtoken");


// ================= REGISTER FUNCTION =================
exports.register = async (req, res) => {
  // Get user input from request body
  const { name, email, password } = req.body;

  try {
    // 1. Check if user already exists (based on email)
    const userExists = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2. Get default role ("user") from roles table
    const roleResult = await pool.query(
      "SELECT role_id FROM roles WHERE role_name = 'user'"
    );
    
    // If role not found → server error
    if (roleResult.rows.length === 0) {
      return res.status(500).json({ message: "Default role not found" });
    }
    
    const roleId = roleResult.rows[0].role_id;

    // 3. Hash user's password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Insert new user into database (without public_user_id first)
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role_id, must_change_password, temp_password, token_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, email, name`,
      [
        name,
        email,
        hashedPassword,
        roleId,
        false,     // must_change_password = false (normal user)
        null,      // temp_password = null
        0          // token_version starts at 0
      ]
    );

    // Get auto-generated user_id
    const userId = result.rows[0].user_id;
    
    // 5. Generate public user ID (e.g., USR-000001)
    const publicUserId = `USR-${String(userId).padStart(6, "0")}`;
    
    // Update user with public_user_id
    await pool.query(
      `UPDATE users SET public_user_id = $1 WHERE user_id = $2`,
      [publicUserId, userId]
    );

    // 6. Generate JWT token (used for authentication)
    const token = jwt.sign(
      { 
        userId: userId, 
        publicUserId: publicUserId,
        role: "user",
        tokenVersion: 0, // used for token invalidation logic
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // token expires in 1 day
    );

    // 7. Send response to client
    res.status(201).json({
      token,
      user: {
        userId: publicUserId,   // return public ID instead of internal ID
        fullName: name,
        email: result.rows[0].email,
        role: "user",
        mustChangePassword: false,
        tempPassword: null
      }
    });

  } catch (err) {
    // Handle unexpected errors
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
};


// ================= LOGIN FUNCTION =================
exports.login = async (req, res) => {
  // Get login credentials from request body
  const { email, password } = req.body;

  try {
    // 1. Fetch user data + role from database
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

    // If user not found
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // 2. Compare input password with hashed password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3. Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        publicUserId: user.public_user_id,
        role: user.role_name,
        tokenVersion: user.token_version, // used for session control
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 4. Send login response
    res.json({
      token,
      user: {
        userId: user.public_user_id, // public ID (USR-xxxxxx)
        fullName: user.name,
        email: user.email,
        role: user.role_name,
        mustChangePassword: user.must_change_password,
        tempPassword: user.temp_password,
      }
    });

  } catch (err) {
    // Handle unexpected errors
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
};