const express = require("express");
const cors = require("cors");

const app = express();

// Import routes
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/users"); // ✅ ADD THIS

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("API is running");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes); // ✅ ADD THIS

module.exports = app;
