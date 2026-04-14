// Import JWT library for token verification
const jwt = require("jsonwebtoken");

// Import database connection
const pool = require("../config/db");

// Middleware to authenticate user using JWT
module.exports = async (req, res, next) => {

  // 1. Get Authorization header from request
  const authHeader = req.headers.authorization;

  // Check if header exists and follows "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No or invalid token provided" });
  }

  // 2. Extract token from header
  const token = authHeader.split(" ")[1];

  try {
    // 3. Verify token using secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Get current token_version from database
    // (used to invalidate old tokens if needed)
    const result = await pool.query(
      "SELECT token_version FROM users WHERE user_id = $1",
      [decoded.userId]
    );

    // If user not found in database
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    // 5. Compare token version (for session control)
    // If mismatch → token is no longer valid (e.g., user logged out from all devices)
    if (
      typeof decoded.tokenVersion === "number" &&
      result.rows[0].token_version !== decoded.tokenVersion
    ) {
      return res.status(401).json({ 
        message: "Session expired. Please log in again." 
      });
    }

    // 6. Attach decoded user info to request object
    req.user = decoded;

    // 7. Continue to next middleware / route
    next();

  } catch (err) {
    // Token invalid or expired
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};