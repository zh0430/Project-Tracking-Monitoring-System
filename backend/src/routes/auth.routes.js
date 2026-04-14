const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

/**
 * AUTHENTICATION ROUTES
 * Handles user registration and login endpoints
 * Public routes - no authentication required
 */

// User registration endpoint
router.post("/register", authController.register);

// User login endpoint
router.post("/login", authController.login);

module.exports = router;