const jwt = require("jsonwebtoken");
const pool = require("../config/db");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No or invalid token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 Fetch current token version from DB
    const result = await pool.query(
      "SELECT token_version FROM users WHERE user_id = $1",
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    // If tokenVersion exists, enforce it (backward compatibility)
    if (
      typeof decoded.tokenVersion === "number" &&
      result.rows[0].token_version !== decoded.tokenVersion
    ) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};