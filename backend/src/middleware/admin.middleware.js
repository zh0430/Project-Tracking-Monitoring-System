// Export middleware function to restrict access to admin users only
module.exports = (req, res, next) => {

  // 1. Check if user information exists in request
  // (This usually comes from JWT authentication middleware)
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" }); // User not logged in
  }

  // 2. Check if user's role is NOT admin
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" }); // Forbidden access
  }

  // 3. If user is admin → allow request to proceed
  next();
};