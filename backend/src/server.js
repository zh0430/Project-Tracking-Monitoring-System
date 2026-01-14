require("dotenv").config();
const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

// Test database connection on server start
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to the database:", err.stack);
  } else {
    console.log("✅ Database connected successfully");
    release(); // Release the client back to the pool
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🔻 Received SIGINT. Closing server and database connections...");
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🔻 Received SIGTERM. Closing server and database connections...");
  await pool.end();
  process.exit(0);
});