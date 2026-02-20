const express = require("express");
const cors = require("cors");

const app = express();

// Import routes
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/users");
const projectsRoutes = require('./routes/projects'); // ✅ ADDED THIS

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check
app.get("/", (req, res) => {
  res.send("API is running");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use('/api/projects', projectsRoutes); // ✅ ADDED THIS

module.exports = app;