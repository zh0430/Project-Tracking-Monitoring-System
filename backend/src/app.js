const express = require("express");
const cors = require("cors");
const path = require('path');

const app = express();

/**
 * EXPRESS APPLICATION CONFIGURATION
 * Main server setup file that configures middleware, CORS settings,
 * static file serving, and registers all API route handlers.
 */

// Import routes
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/users");
const projectsRoutes = require('./routes/projects'); // ✅ ADDED THIS
const milestonesRoutes = require("./routes/milestones");

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static files from uploads directory
// Using the correct path to serve files from the uploads folder in the project root
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get("/", (req, res) => {
  res.send("API is running");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use('/api/projects', projectsRoutes); // ✅ ADDED THIS
app.use("/api/milestones", milestonesRoutes);

module.exports = app;